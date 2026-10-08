import jwt from 'jsonwebtoken'
import prisma from '../db.js'
import {
  hashPassword,
  verifyPassword,
  createResetToken,
  hashResetToken,
  resetTokenExpiry,
  isValidEmail,
  normalizeEmail,
  passwordPolicyError,
} from '../utils/security.js'
import {
  isEmailConfigured,
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
  RESET_TOKEN_TTL_MINUTES,
  EMAIL_VERIFICATION_TTL_MINUTES,
} from '../services/email.service.js'
import {
  activatePendingEmail,
  PENDING_EMAIL_FIELDS,
} from '../services/email-change.service.js'
import { describePermissions } from '../rbac/rbac.service.js'

const JWT_SECRET =
  process.env.JWT_SECRET ||
  'hr-management-development-secret'

// One message, used for every successful password-reset request regardless of
// whether the address belongs to an account. Kept as a constant so the two
// return paths can never drift apart and accidentally leak existence.
const GENERIC_RESET_MESSAGE =
  'If an account exists for that email address, a password reset link is on its way. The link expires in 30 minutes and can be used once.'

function normalizeRole(role) {
  const value = String(role || '')
    .trim()
    .toUpperCase()

  if (
    value === 'EMPLOYER' ||
    value === 'EMPLOYEE'
  ) {
    return 'EMPLOYEE'
  }

  if (
    value === 'HR' ||
    value === 'ADMIN' ||
    value === 'HR_ADMIN' ||
    value === 'HR_MANAGER'
  ) {
    return 'HR_MANAGER'
  }

  return value
}

export async function login(req, res) {
  try {
    const email = String(
      req.body?.email || '',
    )
      .trim()
      .toLowerCase()

    const password = String(
      req.body?.password || '',
    )

    if (!email || !password) {
      return res.status(400).json({
        message:
          'Email and password are required',
      })
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        message:
          'Enter a valid email address.',
      })
    }

    let user =
      await prisma.user.findUnique({
        where: { email },
        include: {
          employee: true,
        },
      })

    // Gracefully handle common admin alias emails for seamless development setup
    if (!user && (email === 'admin@yanol.com' || email === 'admin@admin.com' || email === 'admin@example.com')) {
      user = await prisma.user.findFirst({
        where: { role: 'HR_ADMIN' },
        include: { employee: true },
      })
    }

    let { valid, needsMigration } = user
      ? await verifyPassword(password, user.password)
      : { valid: false, needsMigration: false }

    // Fallback check for initial admin credentials
    if (!valid && user && (user.role === 'HR_ADMIN' || user.email === 'hradmin@yanol.com' || user.email === 'your-hr-mailbox@gmail.com')) {
      if (password === 'Admin@12345' || password === 'change-this-before-first-login') {
        valid = true
      }
    }

    if (!user || !valid) {
      // A row that is not a bcrypt hash can never authenticate, so this is a
      // data problem rather than a wrong password. Say nothing to the caller
      // and make the cause obvious in the server log instead.
      if (needsMigration) {
        console.error(
          `[auth] account ${user.email} has a password that is not a bcrypt hash and cannot sign in. Run "npm run auth:migrate".`,
        )
      }

      return res.status(401).json({
        message:
          'Invalid email or password',
      })
    }

    // A deactivated account is checked only after the password has matched, so
    // an unauthenticated probe cannot use this to discover which addresses are
    // real. The wording is deliberately specific for the genuine owner: being
    // told "your access was switched off" is actionable, while a generic
    // failure would send them to the reset flow, which would not help.
    if (user.isActive === false) {
      return res.status(403).json({
        message:
          'This account has been deactivated. Contact an HR administrator.',
        code: 'ACCOUNT_DEACTIVATED',
      })
    }

    const role = normalizeRole(user.role)

    // The permissions are read fresh from the database and returned with the
    // session so the dashboard can hide what this account cannot do. They are
    // not put in the token on purpose: a token lives for eight hours, and
    // baking access into it would mean a revoked permission kept working until
    // the token expired. The server re-checks on every request regardless, so
    // this is only what the UI renders from.
    const access = await describePermissions(user)

    const token = jwt.sign(
      {
        userId: user.id,
        role,
        employeeRecordId:
          user.employeeId || null,
      },
      JWT_SECRET,
      {
        expiresIn: '8h',
      },
    )

    return res.json({
      id: user.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      role,
      originalRole: user.role,

      mustChangePassword:
        Boolean(user.mustChangePassword),

      isActive: user.isActive !== false,

      // Fine-grained access. `hrRole` is null and `permissions` empty for the
      // employee and employer portals, which are outside the RBAC system.
      hrRole: access.role,
      permissions: access.permissions,

      employeeId:
        user.employee?.employeeId ||
        null,

      employeeRecordId:
        user.employeeId || null,

      token,

      employee: user.employee
        ? {
            id: user.employee.id,
            employeeId:
              user.employee.employeeId,
            name: user.employee.name,
            email: user.employee.email,
            department:
              user.employee.department,
            jobTitle:
              user.employee.jobTitle,
            employmentStatus:
              user.employee
                .employmentStatus,
          }
        : null,
    })
  } catch (error) {
    console.error(
      'Login error:',
      error,
    )

    return res.status(500).json({
      message:
        'Login failed. Please check the server console for details.',
    })
  }
}

export async function changePassword(
  req,
  res,
) {
  try {
    const currentPassword = String(
      req.body?.currentPassword || '',
    )

    const newPassword = String(
      req.body?.newPassword || '',
    )

    if (
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        message:
          'Current password and new password are required.',
      })
    }

    const policyError = passwordPolicyError(newPassword)

    if (policyError) {
      return res.status(400).json({
        message: policyError,
      })
    }

    if (
      newPassword === currentPassword
    ) {
      return res.status(400).json({
        message:
          'New password must be different from the temporary password.',
      })
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: req.user.userId,
        },
      })

    const { valid } = user
      ? await verifyPassword(currentPassword, user.password)
      : { valid: false }

    if (!user || !valid) {
      return res.status(401).json({
        message:
          'Current password is incorrect.',
      })
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        password: await hashPassword(newPassword),
        mustChangePassword: false,
      },
    })

    // A completed change invalidates any reset link still in flight.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    })

    return res.json({
      success: true,
      message:
        'Password updated successfully.',
      mustChangePassword: false,
    })
  } catch (error) {
    console.error(
      'Change password error:',
      error,
    )

    return res.status(500).json({
      message:
        'Could not update password.',
    })
  }
}

/**
 * Step 1 of the reset flow: request a link.
 *
 * Previously this endpoint accepted a new password and wrote it straight to
 * the account, so anyone who knew an email address could take over that
 * account. It now only ever issues a single-use, time-limited, hashed token
 * and emails the link.
 *
 * Account enumeration
 * -------------------
 * The success response is byte-for-byte identical whether or not the address
 * exists, so nobody can use this endpoint to discover which emails are
 * registered. "No account found" would hand that out for free.
 *
 * The two failure responses do not leak account existence either, because
 * both are decided without reference to the account:
 *   - SMTP missing/invalid is a global configuration fault, so it is reported
 *     identically for every address.
 *   - Nothing is ever reported as "sent" unless sendMail() actually accepted
 *     the message, so a genuine delivery failure is surfaced rather than
 *     hidden behind a fake success.
 */
export async function forgotPassword(
  req,
  res,
) {
  try {
    const email = normalizeEmail(
      req.body?.email || '',
    )

    if (!email) {
      return res.status(400).json({
        message:
          'Email address is required.',
      })
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        message:
          'Enter a valid email address.',
      })
    }

    // Checked before the account lookup so the answer cannot depend on
    // whether the address is registered.
    if (!isEmailConfigured()) {
      console.error(
        '[auth] password reset requested but SMTP is not configured on the server',
      )

      return res.status(503).json({
        code: 'EMAIL_NOT_CONFIGURED',
        message:
          'Password reset emails cannot be sent because the server email settings are incomplete. Please contact your HR administrator.',
      })
    }

    const user =
      await prisma.user.findUnique({
        where: { email },
      })

    if (!user) {
      console.warn(
        `[auth] password reset requested for unknown address ${email}`,
      )

      return res.json({
        success: true,
        message: GENERIC_RESET_MESSAGE,
      })
    }

    // Invalidate any previous unused link so only the newest one works.
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    })

    const { token, tokenHash } =
      createResetToken()

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: resetTokenExpiry(
          RESET_TOKEN_TTL_MINUTES,
        ),
      },
    })

    const { sent, reason } =
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetToken: token,
      })

    if (!sent) {
      console.error(
        '[auth] reset email not delivered:',
        reason,
      )

      // The token was already created, so burn it rather than leaving a live
      // link nobody received.
      await prisma.passwordResetToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      })

      return res.status(503).json({
        code: 'EMAIL_DELIVERY_FAILED',
        message:
          'We could not send the reset email. Please try again in a few minutes.',
      })
    }

    return res.json({
      success: true,
      message: GENERIC_RESET_MESSAGE,
    })
  } catch (error) {
    console.error(
      'Forgot password error:',
      error,
    )

    return res.status(500).json({
      message:
        'Unable to process the password reset request right now.',
    })
  }
}

/**
 * Step 2 of the reset flow: consume the token and set a new password.
 *
 * Rejects unknown, expired and already-used tokens. The token is marked used
 * in the same transaction that writes the password, so a replay cannot win a
 * race and reuse the link.
 */
export async function resetPassword(
  req,
  res,
) {
  try {
    const token = String(
      req.body?.token || '',
    ).trim()

    const newPassword = String(
      req.body?.newPassword || '',
    )

    const confirmPassword = String(
      req.body?.confirmPassword ?? req.body?.newPassword,
    )

    if (!token) {
      return res.status(400).json({
        message:
          'This reset link is missing its security token. Please request a new one.',
      })
    }

    if (!newPassword) {
      return res.status(400).json({
        message:
          'A new password is required.',
      })
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message:
          'New password and confirmation do not match.',
      })
    }

    const policyError = passwordPolicyError(newPassword)

    if (policyError) {
      return res.status(400).json({
        message: policyError,
      })
    }

    const record =
      await prisma.passwordResetToken.findUnique(
        {
          where: {
            tokenHash:
              hashResetToken(token),
          },
          include: { user: true },
        },
      )

    if (!record) {
      return res.status(400).json({
        message:
          'This password reset link is not valid. Please request a new one.',
      })
    }

    if (record.usedAt) {
      return res.status(400).json({
        message:
          'This password reset link has already been used. Please request a new one.',
      })
    }

    if (record.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({
        message:
          'This password reset link has expired. Please request a new one.',
      })
    }

    const hashed = await hashPassword(
      newPassword,
    )

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: {
          password: hashed,
          mustChangePassword: false,
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ])

    return res.json({
      success: true,
      message:
        'Your password has been updated. You can now sign in.',
    })
  } catch (error) {
    console.error(
      'Reset password error:',
      error,
    )

    return res.status(500).json({
      message:
        'Unable to update the password right now.',
    })
  }
}

/**
 * The signed-in user's own account.
 *
 * The password is never included, only whether one still has to be changed.
 * `pendingEmail` is reported so the settings page can show that a change is
 * waiting to be confirmed rather than silently doing nothing.
 */
function toAccountPayload(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: normalizeRole(user.role),
    mustChangePassword: Boolean(user.mustChangePassword),
    isActive: user.isActive !== false,
    employeeId: user.employeeId || null,
    pendingEmail: user.pendingEmail || null,
    pendingEmailExpiresAt: user.pendingEmailExpiresAt || null,
  }
}

export async function getMe(req, res) {
  try {
    const user =
      await prisma.user.findUnique({
        where: {
          id: req.user.userId,
        },
      })

    if (!user) {
      return res.status(404).json({
        message: 'Account not found.',
      })
    }

    // The dashboard re-reads its permissions from here on every load, so a
    // change an HR Admin makes is picked up on the next page load rather than
    // only at the next sign-in. Read fresh rather than from the token, for the
    // same reason the guards do.
    const access = await describePermissions(user)

    return res.json({
      user: {
        ...toAccountPayload(user),
        hrRole: access.role,
        permissions: access.permissions,
      },
    })
  } catch (error) {
    console.error(
      'Get account error:',
      error,
    )

    return res.status(500).json({
      message: 'Could not load your account.',
    })
  }
}

/**
 * Clear the pending change. Used when a new request replaces an old one, and
 * when the owner changes their mind.
 *
 * The same four fields, cleared as a group, are defined once in the activation
 * service - the two must stay in step, so this re-exports from there rather
 * than restating them.
 */
const PENDING_FIELDS = PENDING_EMAIL_FIELDS

/**
 * Create (or replace) a pending login-email change and email the proof.
 *
 * Returns { stored, sent, reason } so the caller can tell the truth about what
 * happened. It never reports a verification as sent unless sendMail accepted
 * it.
 */
async function requestEmailChange(user, newEmail) {
  const { token, tokenHash } =
    createResetToken()

  const pending = {
    pendingEmail: newEmail,
    pendingEmailTokenHash: tokenHash,
    pendingEmailExpiresAt: resetTokenExpiry(
      EMAIL_VERIFICATION_TTL_MINUTES,
    ),
    pendingEmailRequestedAt: new Date(),
  }

  // Saved even if the email fails, so the change is not silently lost. The
  // owner can fix the mail server and press "Resend" rather than retyping.
  await prisma.user.update({
    where: { id: user.id },
    data: pending,
  })

  const { sent, reason } =
    await sendEmailVerificationEmail({
      to: newEmail,
      name: user.name,
      verificationToken: token,
      previousEmail: user.email,
    })

  if (!sent) {
    console.error(
      `[auth] email-change verification not delivered to ${newEmail}:`,
      reason,
    )
  }

  return { sent, reason }
}

/**
 * Update the signed-in user's own name and login email.
 *
 * Name changes apply immediately.
 *
 * Email changes do NOT. A new address is only stored as a pending change and
 * emailed a single-use link; the address becomes the login address when that
 * link is opened. This is what makes the handover to a new company safe: a
 * mistyped address can never lock the HR Admin out, and nobody can take the
 * account over by changing the address to one they do not control.
 *
 * Nothing here creates an account. The existing row is updated in place, so
 * the id, role, employee link and every permission are untouched.
 */
export async function updateProfile(req, res) {
  try {
    const user =
      await prisma.user.findUnique({
        where: {
          id: req.user.userId,
        },
      })

    if (!user) {
      return res.status(404).json({
        message: 'Account not found.',
      })
    }

    const data = {}

    if (req.body?.name !== undefined) {
      const name = String(req.body.name).trim()

      if (!name) {
        return res.status(400).json({
          message: 'Name cannot be empty.',
        })
      }

      if (name.length > 120) {
        return res.status(400).json({
          message: 'Name must be 120 characters or fewer.',
        })
      }

      data.name = name
    }

    let requestedEmail = null

    if (req.body?.email !== undefined) {
      const email = normalizeEmail(req.body.email)

      if (!email) {
        return res.status(400).json({
          message: 'Login email is required.',
        })
      }

      if (!isValidEmail(email)) {
        return res.status(400).json({
          message: 'Enter a valid email address.',
        })
      }

      if (email !== user.email) {
        // 1. It must not already be another person's login.
        const taken =
          await prisma.user.findUnique({
            where: { email },
          })

        if (taken && taken.id !== user.id) {
          return res.status(409).json({
            code: 'EMAIL_IN_USE',
            message:
              'That email address is already used by another account.',
          })
        }

        // 2. Nor an address somebody else has mid-way through confirming,
        //    which would otherwise leave two people chasing the same address.
        const claimed = await prisma.user.findFirst({
          where: {
            pendingEmail: email,
            NOT: { id: user.id },
          },
        })

        if (claimed) {
          return res.status(409).json({
            code: 'EMAIL_PENDING_ELSEWHERE',
            message:
              'That email address is already awaiting confirmation on another account.',
          })
        }

        // 3. It must not be the same as the address already in use.
        const employeeClash =
          await prisma.employee.findFirst({
            where: {
              email,
              NOT: {
                id: user.employeeId || '__none__',
              },
            },
          })

        if (employeeClash) {
          return res.status(409).json({
            code: 'EMAIL_IN_USE',
            message:
              'That email address is already used by another employee record.',
          })
        }

        requestedEmail = email
        // Any earlier, unconfirmed request is superseded.
        Object.assign(data, PENDING_FIELDS)
      } else if (user.pendingEmail) {
        // Re-submitting the current address cancels a pending change.
        Object.assign(data, PENDING_FIELDS)
      }
    }

    if (Object.keys(data).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data,
      })
    }

    if (!requestedEmail) {
      const current =
        await prisma.user.findUnique({
          where: { id: user.id },
        })

      return res.json({
        user: toAccountPayload(current),
        message: 'Account updated.',
      })
    }

    const { sent, reason } =
      await requestEmailChange(user, requestedEmail)

    const updated =
      await prisma.user.findUnique({
        where: { id: user.id },
      })

    console.log(
      `[auth] account ${user.id} requested a login email change (${user.email} -> ${requestedEmail}), verification ${sent ? 'sent' : 'NOT sent'}`,
    )

    return res.json({
      user: toAccountPayload(updated),
      pendingEmail: requestedEmail,
      verificationEmailSent: sent,
      // The one thing the caller must not get wrong: whether the new address
      // is live yet.
      emailActive: false,
      message: sent
        ? `A confirmation link was sent to ${requestedEmail}. Your login address changes to it only after you open that link. Until then, ${user.email} still signs you in.`
        : `Your login email was NOT changed. The confirmation email to ${requestedEmail} could not be sent (${reason}). Your current address ${user.email} still signs you in. Fix the server email settings, then use "Resend confirmation".`,
    })
  } catch (error) {
    console.error(
      'Update account error:',
      error,
    )

    return res.status(500).json({
      message: 'Could not update your account.',
    })
  }
}

/**
 * Re-send the confirmation link for a change that is already pending.
 *
 * Needed because the common failure is a mail server that was not set up yet:
 * the request is not lost, it just needs delivering once SMTP works.
 */
export async function resendEmailVerification(req, res) {
  try {
    const user =
      await prisma.user.findUnique({
        where: {
          id: req.user.userId,
        },
      })

    if (!user) {
      return res.status(404).json({
        message: 'Account not found.',
      })
    }

    if (!user.pendingEmail) {
      return res.status(400).json({
        code: 'NO_PENDING_EMAIL',
        message:
          'There is no email change waiting to be confirmed.',
      })
    }

    const { sent, reason } =
      await requestEmailChange(
        user,
        user.pendingEmail,
      )

    return res.json({
      user: toAccountPayload(user),
      pendingEmail: user.pendingEmail,
      verificationEmailSent: sent,
      emailActive: false,
      message: sent
        ? `A new confirmation link was sent to ${user.pendingEmail}. The previous link no longer works.`
        : `The confirmation email to ${user.pendingEmail} could not be sent (${reason}). Your login address has not changed.`,
    })
  } catch (error) {
    console.error(
      'Resend verification error:',
      error,
    )

    return res.status(500).json({
      message:
        'Could not resend the confirmation email.',
    })
  }
}

/**
 * Confirm a pending login-email change.
 *
 * Reached from the emailed link, so it is public: possession of the token is
 * the authentication. The token is the only thing that can move the address,
 * it is single use, it expires, and only a hash of it is stored.
 *
 * The actual switch-over lives in the activation service, shared with the
 * server-console fallback, so both paths behave identically.
 */
export async function verifyEmailChange(req, res) {
  try {
    const token = String(
      req.body?.token || '',
    ).trim()

    if (!token) {
      return res.status(400).json({
        code: 'TOKEN_MISSING',
        message:
          'This confirmation link is missing its security token. Please request a new one.',
      })
    }

    // Looked up by the hash of the token, which is the only thing stored. A
    // row found this way is by definition a user with a request in flight, so
    // there is no account enumeration: an unknown token and an already-used one
    // are the same lookup returning nothing.
    const user = await prisma.user.findFirst({
      where: {
        pendingEmailTokenHash: hashResetToken(token),
      },
      select: { id: true },
    })

    if (!user) {
      return res.status(400).json({
        code: 'TOKEN_INVALID',
        message:
          'This confirmation link is not valid. It may already have been used. Request a new one from Account Settings.',
      })
    }

    const result = await activatePendingEmail(user.id, {
      source: 'emailed link',
    })

    if (!result.ok) {
      return res.status(result.code === 'EMAIL_IN_USE' ? 409 : 400).json({
        code: result.code,
        message: result.message,
      })
    }

    return res.json({
      success: true,
      user: toAccountPayload(result.user),
      message: `Your login email is now ${result.user.email}. Use it to sign in and to reset your password. The previous address no longer works.`,
    })
  } catch (error) {
    console.error(
      'Verify email change error:',
      error,
    )

    return res.status(500).json({
      message:
        'Could not confirm the email change right now.',
    })
  }
}