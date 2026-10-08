import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  Check,
  CircleDollarSign,
  Clock3,
  Globe,
  KeyRound,
  ListChecks,
  LocateFixed,
  MailCheck,
  MapPin,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react'

import { Button, PageTitle } from '../../components/ui'
import {
  fetchMyAccount,
  updateMyAccount,
  resendEmailVerificationApi,
  changePasswordApi,
} from '../../lib/accountApi'
import { authHeaders, describeAuthFailure } from '../../lib/hrApi'
import { setAttendanceConfig } from '../../Employer/lib/workTime'
import { toEthiopianTime } from '../../Employer/lib/addisTime'

const API_URL = '/api/hr-manager'

const EMPTY_SETTINGS = {
  departments: [],
  jobTitles: [],
  employmentTypes: [],
  employmentStatuses: [],
  genders: [],
  leaveTypes: [],
  attendanceStatuses: [],
  approvalStatuses: [],
  deductionTypes: [],

  attendanceCodes: {},

  payrollConfiguration: {
    overtimeRateMultiplier: 1.5,
    standardMonthlyWorkingHours: 208,
    taxablePercentOfAllowances: 1,
    employeePensionRate: 0.07,
    employerPensionRate: 0.11,
  },

  attendanceConfiguration: {
    checkInStartTime: '08:00',
    requiredCheckInTime: '08:30',
    checkOutStartTime: '17:30',
    checkOutEndTime: '19:00',
    geoRestrictionEnabled: true,
    officeLatitude: 8.999654748138806,
    officeLongitude: 38.820610900000005,
    allowedRadiusMeters: 100,
  },

  companyInformation: {
    companyName: 'Yanol Tech',
    address: '',
    phone: '',
    email: '',
    logo: '',
  },

  accessPermissions: {
    'Employee Management': true,
    'Attendance Management': true,
    'Leave Management': true,
    'Payroll Management': true,
    'Payment Slips': true,
    'HR Reports': true,
  },
}

const LIST_CONFIG = [
  { key: 'departments', label: 'Departments' },
  { key: 'jobTitles', label: 'Job Titles' },
  { key: 'employmentTypes', label: 'Employment Types' },
  { key: 'employmentStatuses', label: 'Employment Status' },
  { key: 'genders', label: 'Gender' },
  { key: 'leaveTypes', label: 'Leave Types' },
  { key: 'attendanceStatuses', label: 'Attendance Status' },
  { key: 'approvalStatuses', label: 'Approval Status' },
  { key: 'deductionTypes', label: 'Deduction Types' },
]

function cloneSettings(value) {
  return JSON.parse(JSON.stringify(value))
}

// "HH:MM" → minutes since midnight, or null when unusable.
function toMinutes(value) {
  const match = String(value ?? '').match(
    /^(\d{1,2}):(\d{2})$/,
  )

  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null
  }

  return hours * 60 + minutes
}

// "17:30" → "11:30 ከሰዓት", Ethiopian time formatted label
function formatClock(value) {
  const minutes = toMinutes(value)

  if (minutes === null) return '—'

  const { hour, minute, period } = toEthiopianTime(minutes)
  return `${hour}:${String(minute).padStart(2, '0')} ${period}`
}

function SettingsCard({
  icon: Icon,
  title,
  children,
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.045)] transition-shadow duration-200 hover:shadow-[0_12px_36px_rgba(15,23,42,0.07)]">
      <div className="flex items-start gap-4 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/70 p-6">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-white p-3.5 shadow-sm ring-1 ring-indigo-100/80">
          <Icon className="h-5 w-5 text-[#4755AE]" />
        </div>

        <div>
          <h2 className="text-base font-bold text-[#0092B8]">
            {title}
          </h2>
        </div>
      </div>

      <div className="p-6">
        {children}
      </div>
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  min,
  max,
  step,
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>

      <input
        type={type}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#4755AE] focus:ring-4 focus:ring-[#4755AE]/10"
      />
    </label>
  )
}

function ListEditor({
  title,
  items,
  onChange,
  counts = {},
  onValidateRemove = null,
}) {
  const [newItem, setNewItem] = useState('')
  const [validationError, setValidationError] = useState('')

  const addItem = () => {
    const value = newItem.trim()

    if (!value || items.includes(value)) {
      return
    }

    setValidationError('')
    onChange([...items, value])
    setNewItem('')
  }

  const removeItem = (item) => {
    if (onValidateRemove) {
      const err = onValidateRemove(item)
      if (err) {
        setValidationError(err)
        return
      }
    }

    setValidationError('')
    onChange(
      items.filter((current) => current !== item),
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900">
          {title}
        </h3>

        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
          {items.length}
        </span>
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={newItem}
          onChange={(event) =>
            setNewItem(event.target.value)
          }
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              addItem()
            }
          }}
          placeholder={`Add ${title
            .toLowerCase()
            .replace(/s$/, '')}`}
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#4755AE] focus:ring-4 focus:ring-[#4755AE]/10"
        />

        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#4755AE] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3d4998]"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {validationError && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <strong>Action Blocked: </strong>{validationError}
          </div>
          <button
            type="button"
            onClick={() => setValidationError('')}
            className="text-rose-500 hover:text-rose-700 font-bold px-1"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {items.map((item) => {
          const assignedCount = counts[item] ?? 0
          const hasEmployees = assignedCount > 0

          return (
            <div
              key={item}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3.5 py-2.5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-slate-700 truncate">
                  {item}
                </span>

                {counts[item] !== undefined && (
                  hasEmployees ? (
                    <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200/80">
                      {assignedCount} employee{assignedCount > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400">
                      0 assigned
                    </span>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={() => removeItem(item)}
                className={`rounded-lg p-1.5 transition ${
                  hasEmployees
                    ? 'text-slate-300 hover:text-rose-600 hover:bg-rose-50'
                    : 'text-slate-400 hover:bg-white hover:text-red-600'
                }`}
                title={
                  hasEmployees
                    ? `Cannot delete: ${assignedCount} employee(s) assigned`
                    : `Remove ${item}`
                }
                aria-label={`Remove ${item}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )
        })}

        {!items.length && (
          <p className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-400">
            No values configured.
          </p>
        )}
      </div>
    </div>
  )
}

function AttendanceCodeEditor({ codes, onChange }) {
  const entries = useMemo(
    () => Object.entries(codes || {}),
    [codes],
  )

  const updateCode = (oldCode, field, value) => {
    const next = { ...codes }
    const current = next[oldCode] || ''

    const updated =
      field === 'code'
        ? value.toUpperCase().trim()
        : value

    if (field === 'code') {
      if (
        !updated ||
        (updated !== oldCode && next[updated])
      ) {
        return
      }

      delete next[oldCode]
      next[updated] = current
    } else {
      next[oldCode] = updated
    }

    onChange(next)
  }

  const removeCode = (code) => {
    const next = { ...codes }

    delete next[code]

    onChange(next)
  }

  const addCode = () => {
    let index = 1
    let code = `NEW${index}`

    while (codes[code]) {
      index += 1
      code = `NEW${index}`
    }

    onChange({
      ...codes,
      [code]: 'New Attendance Status',
    })
  }

  return (
    <div className="space-y-3">
      {entries.map(([code, label]) => (
        <div
          key={code}
          className="grid gap-2 sm:grid-cols-[110px_1fr_auto]"
        >
          <input
            value={code}
            onChange={(event) =>
              updateCode(
                code,
                'code',
                event.target.value,
              )
            }
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold uppercase outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />

          <input
            value={label}
            onChange={(event) =>
              updateCode(
                code,
                'label',
                event.target.value,
              )
            }
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />

          <button
            type="button"
            onClick={() => removeCode(code)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-slate-400 hover:border-red-200 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addCode}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        <Plus className="h-4 w-4" />
        Add Attendance Code
      </button>
    </div>
  )
}

function HRSettings() {
  const [settings, setSettings] = useState(
    cloneSettings(EMPTY_SETTINGS),
  )

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')
  const [departmentUsage, setDepartmentUsage] = useState({})

  const loadDepartmentUsage = async () => {
    try {
      const res = await fetch(`${API_URL}/departments/usage`, {
        headers: authHeaders(),
      })
      if (res.ok) {
        const usage = await res.json()
        setDepartmentUsage(usage || {})
      }
    } catch {
      // Ignored
    }
  }

  useEffect(() => {
    loadDepartmentUsage()
  }, [])

  // The signed-in admin's own login details. Deliberately separate from
  // companyInformation below, which is the organisation's public address and
  // has nothing to do with how anyone signs in.
  const [account, setAccount] = useState(null)
  const [accountName, setAccountName] = useState('')
  const [accountEmail, setAccountEmail] = useState('')
  const [accountRole, setAccountRole] = useState('')
  const [accountLoading, setAccountLoading] = useState(true)
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountMessage, setAccountMessage] = useState('')
  const [accountError, setAccountError] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const [resending, setResending] = useState(false)

  // Password change. The temporary setup password is replaced here, which is
  // the last step of handing the system to a company.
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const applyAccount = (user) => {
    if (!user) return

    setAccount(user)
    setAccountName(user.name || '')
    setAccountEmail(user.email || '')
    setAccountRole(user.role || '')
    setPendingEmail(user.pendingEmail || '')
  }

  useEffect(() => {
    let active = true

    fetchMyAccount()
      .then((data) => {
        if (active) applyAccount(data?.user)
      })
      .catch((requestError) => {
        if (active) {
          setAccountError(
            requestError.message ||
              'Could not load your account details.',
          )
        }
      })
      .finally(() => {
        if (active) setAccountLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  // Keep the locally stored session in step, so the rest of the app shows the
  // new address straight away rather than after the next sign-in.
  const syncStoredUser = (user) => {
    try {
      const raw = localStorage.getItem('user')

      if (!raw) return

      const stored = JSON.parse(raw)

      localStorage.setItem(
        'user',
        JSON.stringify({
          ...stored,
          name: user.name,
          email: user.email,
          role: user.role,
        }),
      )
    } catch {
      // A missing or corrupt local session must not break the save.
    }
  }

  const handleAccountSave = async () => {
    const email = accountEmail.trim().toLowerCase()

    setAccountSaving(true)
    setAccountMessage('')
    setAccountError('')

    try {
      if (!email) {
        throw new Error('Login email is required.')
      }

      if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) {
        throw new Error('Enter a valid email address.')
      }

      const data = await updateMyAccount({
        name: accountName.trim(),
        email,
      })

      if (data?.user) {
        applyAccount(data.user)
        syncStoredUser(data.user)
      }

      setAccountMessage(
        data?.message || 'Account updated.',
      )
    } catch (requestError) {
      setAccountError(
        requestError.message ||
          'Could not save your account details.',
      )
    } finally {
      setAccountSaving(false)
    }
  }

  const handleResendVerification = async () => {
    setResending(true)
    setAccountMessage('')
    setAccountError('')

    try {
      const data = await resendEmailVerificationApi()

      if (data?.user) applyAccount(data.user)

      setAccountMessage(
        data?.message ||
          'Confirmation link sent. Check the new address.',
      )
    } catch (requestError) {
      setAccountError(
        requestError.message ||
          'Could not resend the confirmation email.',
      )
    } finally {
      setResending(false)
    }
  }

  const handlePasswordChange = async (event) => {
    event.preventDefault()

    setPasswordMessage('')
    setPasswordError('')

    if (!currentPassword) {
      setPasswordError('Enter your current password.')
      return
    }

    if (newPassword.length < 8) {
      setPasswordError(
        'New password must be at least 8 characters.',
      )
      return
    }

    if (newPassword === currentPassword) {
      setPasswordError(
        'The new password must be different from the current one.',
      )
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('The new passwords do not match.')
      return
    }

    setPasswordSaving(true)

    try {
      const data = await changePasswordApi({
        currentPassword,
        newPassword,
      })

      // Cleared either way, so the form never keeps a password in memory.
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      setPasswordMessage(
        data?.message ||
          'Password changed successfully.',
      )

      // The temporary-password warning should go away without a page reload.
      fetchMyAccount()
        .then((result) => applyAccount(result?.user))
        .catch(() => {})
    } catch (requestError) {
      setPasswordError(
        requestError.message ||
          'Could not change your password.',
      )
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleDetectLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationMessage('Geolocation is not supported by your browser.')
      return
    }
    setDetectingLocation(true)
    setLocationMessage('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetectingLocation(false)
        updateAttendanceConfiguration('officeLatitude', Number(pos.coords.latitude.toFixed(6)))
        updateAttendanceConfiguration('officeLongitude', Number(pos.coords.longitude.toFixed(6)))
        setLocationMessage(`Detected location (${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}) successfully!`)
        setTimeout(() => setLocationMessage(''), 4000)
      },
      (err) => {
        setDetectingLocation(false)
        setLocationMessage(`Location access failed: ${err.message}`)
        setTimeout(() => setLocationMessage(''), 5000)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  useEffect(() => {
    let active = true

    async function loadSettings() {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(`${API_URL}/settings`, {
          headers: authHeaders(),
        })

        const text = await response.text().catch(() => '')
        let data = {}
        try {
          data = text ? JSON.parse(text) : {}
        } catch {
          data = {}
        }

        if (!response.ok) {
          throw new Error(
            data.message ||
              describeAuthFailure(response, data) ||
              (response.status === 502 || response.status === 503
                ? 'Server is temporarily unavailable. Please make sure the server is running.'
                : `Failed to load HR settings (${response.status})`),
          )
        }

        if (active) {
          setSettings({
            ...cloneSettings(EMPTY_SETTINGS),
            ...data,
            payrollConfiguration: {
              ...EMPTY_SETTINGS.payrollConfiguration,
              ...(data.payrollConfiguration || {}),
            },
            attendanceConfiguration: {
              ...EMPTY_SETTINGS.attendanceConfiguration,
              ...(data.attendanceConfiguration || {}),
            },
            companyInformation: {
              ...EMPTY_SETTINGS.companyInformation,
              ...(data.companyInformation || {}),
            },
            accessPermissions: {
              ...EMPTY_SETTINGS.accessPermissions,
              ...(data.accessPermissions || {}),
            },
          })

          if (data.attendanceConfiguration) {
            setAttendanceConfig(data.attendanceConfiguration)
          }
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError.message ||
              'Failed to load HR settings.',
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadSettings()

    return () => {
      active = false
    }
  }, [])

  const updateSetting = (key, value) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }))

    setSaved(false)
  }

  const updatePayroll = (key, value) => {
    setSettings((current) => ({
      ...current,
      payrollConfiguration: {
        ...current.payrollConfiguration,
        [key]: value,
      },
    }))

    setSaved(false)
  }

  const updateAttendanceConfiguration = (
    key,
    value,
  ) => {
    setSettings((current) => ({
      ...current,
      attendanceConfiguration: {
        ...current.attendanceConfiguration,
        [key]: value,
      },
    }))

    setSaved(false)
  }

  const updateCompany = (key, value) => {
    setSettings((current) => ({
      ...current,
      companyInformation: {
        ...current.companyInformation,
        [key]: value,
      },
    }))

    setSaved(false)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setSaved(false)
      setError('')

      const response = await fetch(
        `${API_URL}/settings`,
        {
          method: 'PUT',
          headers: authHeaders({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(settings),
        },
      )

      const text = await response.text().catch(() => '')
      let data = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        data = {}
      }

      if (!response.ok) {
        const details = Array.isArray(data.errors)
          ? ` ${data.errors.join(' ')}`
          : ''

        throw new Error(
          (data.message ||
            describeAuthFailure(response, data) ||
            (response.status === 502 || response.status === 503
              ? 'Server is temporarily unavailable. Please make sure the server is running.'
              : `Failed to save HR settings (${response.status})`)) +
            details,
        )
      }

      setSettings({
        ...cloneSettings(EMPTY_SETTINGS),
        ...data,
        payrollConfiguration: {
          ...EMPTY_SETTINGS.payrollConfiguration,
          ...(data.payrollConfiguration || {}),
        },
        attendanceConfiguration: {
          ...EMPTY_SETTINGS.attendanceConfiguration,
          ...(data.attendanceConfiguration || {}),
        },
        companyInformation: {
          ...EMPTY_SETTINGS.companyInformation,
          ...(data.companyInformation || {}),
        },
        accessPermissions: {
          ...EMPTY_SETTINGS.accessPermissions,
          ...(data.accessPermissions || {}),
        },
      })

      setSaved(true)

      if (data?.attendanceConfiguration) {
        setAttendanceConfig(data.attendanceConfiguration)
        window.dispatchEvent(
          new CustomEvent('attendance-config-updated', {
            detail: data.attendanceConfiguration,
          }),
        )
      }

      window.dispatchEvent(new Event('hr-access-updated'))

      window.setTimeout(() => {
        setSaved(false)
      }, 3000)
    } catch (requestError) {
      setError(
        requestError.message ||
          'Failed to save HR settings.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-[#F3F4F6] to-indigo-50/30 p-6 lg:p-8">
        <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
          Loading HR settings from the database...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-[#F3F4F6] text-slate-950">
      <main className="w-full max-w-[1600px] px-5 py-6 sm:px-8 space-y-6">

        {/* Shared Page Title */}
        <PageTitle
          eyebrow="System Configuration"
          title="HR Settings"
          description="Configure organization details, statutory tax brackets, working hours, and access permissions."
          action={
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              icon={saved ? Check : Save}
              loading={saving}
              loadingText="Saving..."
            >
              {saved ? 'Saved' : 'Save Settings'}
            </Button>
          }
          className="animate-employee-hero mb-8 px-0 py-2"
        />

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Saved */}
        {saved && (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            <Check className="h-5 w-5" />
            Settings saved to the HR database successfully.
          </div>
        )}

        {/* My Account - the address that signs in and receives reset links */}
        <SettingsCard
          icon={UserRound}
          title="My Account"
        >
          {accountLoading ? (
            <p className="text-sm text-slate-500">
              Loading your account details...
            </p>
          ) : (
            <>
              {/* Temporary setup password. Disappears the moment the real one
                  is set, so it is a checklist item rather than a nag. */}
              {account?.mustChangePassword && (
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                  <AlertTriangle
                    size={18}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />
                  <div>
                    <p className="text-sm font-bold text-amber-900">
                      You are still using the temporary setup
                      password
                    </p>
                    <p className="mt-1 text-sm leading-6 text-amber-800">
                      Set your own password below before handing
                      this system over. It is the only thing
                      standing between a published account and
                      anyone who guesses the default.
                    </p>
                  </div>
                </div>
              )}

              <p className="mb-5 text-sm leading-relaxed text-slate-600">
                This is the email address you sign in with, and the
                address &quot;Forgot password&quot; sends reset links
                to. A new address is never switched on straight
                away - we email a confirmation link first, so a
                mistyped address can never lock you out. Your role,
                permissions and employee record stay exactly as
                they are throughout.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Your Name"
                  value={accountName}
                  onChange={setAccountName}
                  placeholder="Your full name"
                />

                <Field
                  label="Login Email"
                  type="email"
                  value={accountEmail}
                  onChange={(value) => {
                    setAccountEmail(value)
                    setAccountMessage('')
                    setAccountError('')
                  }}
                  placeholder="you@company.com"
                />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-4">
                <Button
                  type="button"
                  onClick={handleAccountSave}
                  disabled={accountSaving}
                  icon={Check}
                  loading={accountSaving}
                  loadingText="Saving..."
                >
                  Save My Account
                </Button>

                {accountRole && (
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Role: {accountRole.replace(/_/g, ' ')}
                  </span>
                )}
              </div>

              {/* A change that has been requested but not yet confirmed. */}
              {pendingEmail && (
                <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <MailCheck
                      size={18}
                      className="mt-0.5 shrink-0 text-[#0092B8]"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-cyan-900">
                        Waiting for confirmation
                      </p>
                      <p className="mt-1 text-sm leading-6 text-cyan-900/80">
                        A confirmation link was sent to{' '}
                        <span className="font-semibold break-all">
                          {pendingEmail}
                        </span>
                        . Your login address stays{' '}
                        <span className="font-semibold">
                          {accountEmail}
                        </span>{' '}
                        until that link is opened.
                      </p>

                      <Button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resending}
                        icon={Send}
                        loading={resending}
                        loadingText="Sending..."
                        className="mt-3"
                      >
                        Resend confirmation
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {accountError && (
                <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {accountError}
                </p>
              )}

              {accountMessage && (
                <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {accountMessage}
                </p>
              )}

              {/* Password */}
              <div className="mt-8 border-t border-slate-100 pt-7">
                <div className="mb-4 flex items-center gap-2.5">
                  <KeyRound
                    size={17}
                    className="text-slate-400"
                  />
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">
                    Change password
                  </h3>
                </div>

                <form
                  onSubmit={handlePasswordChange}
                >
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Current password
                      </span>
                      <input
                        type="password"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(event) =>
                          setCurrentPassword(event.target.value)
                        }
                        placeholder="Temporary or current"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#4755AE] focus:ring-4 focus:ring-[#4755AE]/10"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        New password
                      </span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(event) =>
                          setNewPassword(event.target.value)
                        }
                        placeholder="At least 8 characters"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#4755AE] focus:ring-4 focus:ring-[#4755AE]/10"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Confirm new password
                      </span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                        placeholder="Repeat it"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#4755AE] focus:ring-4 focus:ring-[#4755AE]/10"
                      />
                    </label>
                  </div>

                  <div className="mt-5">
                    <Button
                      type="submit"
                      disabled={passwordSaving}
                      icon={KeyRound}
                      loading={passwordSaving}
                      loadingText="Updating..."
                    >
                      Update Password
                    </Button>
                  </div>

                  {passwordError && (
                    <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {passwordError}
                    </p>
                  )}

                  {passwordMessage && (
                    <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      {passwordMessage}
                    </p>
                  )}
                </form>
              </div>
            </>
          )}
        </SettingsCard>

        {/* Company Information */}
        <SettingsCard
          icon={Building2}
          title="Company Information"
          description="Company information defined by the workbook Settings sheet."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Company Name"
              value={
                settings.companyInformation?.companyName
              }
              onChange={(value) =>
                updateCompany(
                  'companyName',
                  value,
                )
              }
            />

            <Field
              label="Company Email"
              type="email"
              value={
                settings.companyInformation?.email
              }
              onChange={(value) =>
                updateCompany('email', value)
              }
              placeholder="hr@yanoltech.com"
            />

            <Field
              label="Company Phone"
              value={
                settings.companyInformation?.phone
              }
              onChange={(value) =>
                updateCompany('phone', value)
              }
              placeholder="+251 ..."
            />

            <Field
              label="Company Address"
              value={
                settings.companyInformation?.address
              }
              onChange={(value) =>
                updateCompany(
                  'address',
                  value,
                )
              }
              placeholder="Add company address"
            />

            <div className="md:col-span-2">
              <Field
                label="Company Logo"
                value={
                  settings.companyInformation?.logo
                }
                onChange={(value) =>
                  updateCompany('logo', value)
                }
                placeholder="Logo reference or URL"
              />
            </div>
          </div>
        </SettingsCard>

        {/* Payroll */}
        <SettingsCard
          icon={CircleDollarSign}
          title="Payroll Configuration"
          description="Statutory and payroll parameters from the workbook."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Overtime Rate Multiplier"
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={
                settings.payrollConfiguration
                  ?.overtimeRateMultiplier
              }
              onChange={(value) =>
                updatePayroll(
                  'overtimeRateMultiplier',
                  value,
                )
              }
            />

            <Field
              label="Standard Monthly Working Hours"
              type="number"
              min="1"
              max="744"
              step="1"
              value={
                settings.payrollConfiguration
                  ?.standardMonthlyWorkingHours
              }
              onChange={(value) =>
                updatePayroll(
                  'standardMonthlyWorkingHours',
                  value,
                )
              }
            />

            <Field
              label="Taxable % of Allowances"
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={
                settings.payrollConfiguration
                  ?.taxablePercentOfAllowances
              }
              onChange={(value) =>
                updatePayroll(
                  'taxablePercentOfAllowances',
                  value,
                )
              }
            />

            <Field
              label="Employee Pension Rate"
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={
                settings.payrollConfiguration
                  ?.employeePensionRate
              }
              onChange={(value) =>
                updatePayroll(
                  'employeePensionRate',
                  value,
                )
              }
            />

            <Field
              label="Employer Pension Rate"
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={
                settings.payrollConfiguration
                  ?.employerPensionRate
              }
              onChange={(value) =>
                updatePayroll(
                  'employerPensionRate',
                  value,
                )
              }
            />
          </div>

        </SettingsCard>

        {/* Attendance & Location */}
        <SettingsCard
          icon={MapPin}
          title="Check-In & Check-Out Schedule"
          description="Set employee check-in and check-out windows and late arrival cutoff times."
        >
          {/* Work Hours & Punch Times */}
          <div className="mb-6">
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Clock3 className="h-4 w-4 text-slate-600" />
              Employee Check-In & Check-Out Hours
            </h3>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Field
                  label="Check-In Opens (From)"
                  type="time"
                  value={
                    settings.attendanceConfiguration?.checkInStartTime || '08:00'
                  }
                  onChange={(value) =>
                    updateAttendanceConfiguration('checkInStartTime', value)
                  }
                />
                <p className="mt-1 text-[11px] font-semibold text-indigo-600">
                  Ethiopian: {formatClock(settings.attendanceConfiguration?.checkInStartTime || '08:00')}
                </p>
              </div>

              <div>
                <Field
                  label="On-Time Cutoff (After = Late)"
                  type="time"
                  value={
                    settings.attendanceConfiguration?.requiredCheckInTime || '08:30'
                  }
                  onChange={(value) =>
                    updateAttendanceConfiguration('requiredCheckInTime', value)
                  }
                />
                <p className="mt-1 text-[11px] font-semibold text-indigo-600">
                  Ethiopian: {formatClock(settings.attendanceConfiguration?.requiredCheckInTime || '08:30')}
                </p>
              </div>

              <div>
                <Field
                  label="Check-Out Opens (From)"
                  type="time"
                  value={
                    settings.attendanceConfiguration?.checkOutStartTime || '17:30'
                  }
                  onChange={(value) =>
                    updateAttendanceConfiguration('checkOutStartTime', value)
                  }
                />
                <p className="mt-1 text-[11px] font-semibold text-indigo-600">
                  Ethiopian: {formatClock(settings.attendanceConfiguration?.checkOutStartTime || '17:30')}
                </p>
              </div>

              <div>
                <Field
                  label="Scheduled Check-Out End"
                  type="time"
                  value={
                    settings.attendanceConfiguration?.checkOutEndTime || '19:00'
                  }
                  onChange={(value) =>
                    updateAttendanceConfiguration('checkOutEndTime', value)
                  }
                />
                <p className="mt-1 text-[11px] font-semibold text-indigo-600">
                  Ethiopian: {formatClock(settings.attendanceConfiguration?.checkOutEndTime || '19:00')}
                </p>
              </div>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              These four times drive the employee punch buttons directly, with no
              restart. <strong className="font-semibold text-slate-700">Check-In
              Opens</strong> is when the employee&rsquo;s Check In button becomes
              available; <strong className="font-semibold text-slate-700">On-Time
              Cutoff</strong> is where lateness starts counting. Nothing closes: an
              employee who arrives late can still check in, and the minutes past the
              cutoff are recorded against them. The same applies to check-out —
              the button opens at <strong className="font-semibold text-slate-700">
              Check-Out Opens</strong> and stays available, while{' '}
              <strong className="font-semibold text-slate-700">Scheduled Check-Out
              End</strong> is what an early departure or overtime is measured
              against. This way no employee can be locked out of recording their
              own day.
            </p>

            {/* ── What the employee will actually see ──
                Same arithmetic the employee portal uses, so a change
                here is visibly reflected rather than having to be
                guessed at. */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                {
                  label: 'Employee Check-In',
                  from:
                    settings.attendanceConfiguration
                      ?.checkInStartTime || '08:00',
                  to:
                    settings.attendanceConfiguration
                      ?.requiredCheckInTime || '08:30',
                },
                {
                  label: 'Employee Check-Out',
                  from:
                    settings.attendanceConfiguration
                      ?.checkOutStartTime || '17:30',
                  to:
                    settings.attendanceConfiguration
                      ?.checkOutEndTime || '19:00',
                },
              ].map((punchWindow) => {
                const fromMinutes = toMinutes(
                  punchWindow.from,
                )
                const toMinutesValue = toMinutes(
                  punchWindow.to,
                )

                const valid =
                  fromMinutes !== null &&
                  toMinutesValue !== null &&
                  fromMinutes <= toMinutesValue

                return (
                  <div
                    key={punchWindow.label}
                    className={`rounded-2xl border px-4 py-3.5 ${
                      valid
                        ? 'border-emerald-200 bg-emerald-50/60'
                        : 'border-rose-200 bg-rose-50/60'
                    }`}
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {punchWindow.label}
                    </p>

                    <p className="mt-1 text-lg font-bold tabular-nums text-slate-800">
                      {formatClock(punchWindow.from)}
                      {' → '}
                      {formatClock(punchWindow.to)}
                    </p>

                    <p
                      className={`mt-1 text-xs font-semibold ${
                        valid
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {valid
                        ? 'Available — the punch button opens and closes at these times (Ethiopian Time).'
                        : 'Unavailable — the end time must not be earlier than the start time.'}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          icon={Globe}
          title="Geo-Restriction & Office Location"
          description="Configure whether employees must be inside the office geofence to record attendance."
        >
          {/* Geo Restriction & Office Geofence */}
          <div>
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Globe className="h-4 w-4 text-slate-600" />
                  Office Geofence & Location Restriction
                </h3>

              </div>

              {/* Toggle Geo Restriction */}
              <button
                type="button"
                onClick={() =>
                  updateAttendanceConfiguration(
                    'geoRestrictionEnabled',
                    settings.attendanceConfiguration?.geoRestrictionEnabled === false
                      ? true
                      : false,
                  )
                }
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all ${
                  settings.attendanceConfiguration?.geoRestrictionEnabled !== false
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    settings.attendanceConfiguration?.geoRestrictionEnabled !== false
                      ? 'animate-pulse bg-emerald-500'
                      : 'bg-amber-500'
                  }`}
                />
                {settings.attendanceConfiguration?.geoRestrictionEnabled !== false
                  ? 'Geofence Enforced (Active)'
                  : 'Geofence Disabled (Remote Allowed)'}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field
                label="Allowed Radius (Meters)"
                type="number"
                min="1"
                max="10000"
                step="1"
                value={settings.attendanceConfiguration?.allowedRadiusMeters ?? 100}
                onChange={(value) =>
                  updateAttendanceConfiguration('allowedRadiusMeters', value)
                }
              />

              <Field
                label="Office Latitude"
                type="number"
                step="any"
                value={settings.attendanceConfiguration?.officeLatitude ?? ''}
                onChange={(value) =>
                  updateAttendanceConfiguration('officeLatitude', value)
                }
              />

              <Field
                label="Office Longitude"
                type="number"
                step="any"
                value={settings.attendanceConfiguration?.officeLongitude ?? ''}
                onChange={(value) =>
                  updateAttendanceConfiguration('officeLongitude', value)
                }
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={detectingLocation}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <LocateFixed className="h-3.5 w-3.5 text-indigo-600" />
                {detectingLocation ? 'Detecting Location...' : 'Use My Device Location as Office Coordinates'}
              </button>

              {locationMessage && (
                <span className="text-xs font-medium text-emerald-600">
                  {locationMessage}
                </span>
              )}
            </div>

            {/* Geofence Preview Card */}
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-white p-2">
                  <MapPin className="h-5 w-5 text-slate-700" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">
                      Office Geofence Status
                    </p>

                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                        settings.attendanceConfiguration?.geoRestrictionEnabled !== false
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {settings.attendanceConfiguration?.geoRestrictionEnabled !== false
                        ? 'Enforcing Geofence'
                        : 'Bypassing Geofence'}
                    </span>
                  </div>

                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Latitude
                  </p>

                  <p className="mt-1 break-all text-sm font-semibold text-slate-700">
                    {settings.attendanceConfiguration?.officeLatitude ?? 'Not Set'}
                  </p>
                </div>

                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Longitude
                  </p>

                  <p className="mt-1 break-all text-sm font-semibold text-slate-700">
                    {settings.attendanceConfiguration?.officeLongitude ?? 'Not Set'}
                  </p>
                </div>

                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Radius
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {settings.attendanceConfiguration?.allowedRadiusMeters ?? 100} meters
                  </p>
                </div>
              </div>
            </div>

          </div>
        </SettingsCard>

        {/* HR Lists */}
        <SettingsCard
          icon={ListChecks}
          title="Configurable HR Lists"
          description="Maintain the selectable HR values used throughout the system."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {LIST_CONFIG.map(({ key, label }) => (
              <ListEditor
                key={key}
                title={label}
                items={settings[key] || []}
                counts={key === 'departments' ? departmentUsage : {}}
                onValidateRemove={
                  key === 'departments'
                    ? (dept) => {
                        const count = departmentUsage[dept] || 0
                        if (count > 0) {
                          return `Cannot delete department "${dept}": ${count} active employee${count > 1 ? 's are' : ' is'} assigned to it. Please reassign all employees in Employee Management before deleting.`
                        }
                        return null
                      }
                    : null
                }
                onChange={(value) =>
                  updateSetting(key, value)
                }
              />
            ))}
          </div>
        </SettingsCard>

        {/* Attendance Codes */}
        <SettingsCard
          icon={Clock3}
          title="Attendance Codes"
          description="Attendance codes and labels defined in the workbook."
        >
          <AttendanceCodeEditor
            codes={settings.attendanceCodes || {}}
            onChange={(value) =>
              updateSetting(
                'attendanceCodes',
                value,
              )
            }
          />
        </SettingsCard>

        {/* Bottom Save */}
        <div className="flex justify-end pb-4">
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            icon={saved ? Check : Save}
            loading={saving}
            loadingText="Saving..."
            size="lg"
          >
            {saved ? 'Settings Saved' : 'Save Settings'}
          </Button>
        </div>
      </main>
    </div>
  )
}

export default HRSettings
