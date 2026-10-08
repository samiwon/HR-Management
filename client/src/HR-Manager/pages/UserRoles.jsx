import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Check,
  Info,
  KeyRound,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  X,
} from 'lucide-react'

import { PageTitle } from '../../components/ui'
import { authHeaders } from '../../lib/hrApi'
import { Can, useAccess } from '../../lib/rbac'

const API = '/api/hr-manager'

async function request(path = '', options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: authHeaders(options.body ? { 'Content-Type': 'application/json' } : {}),
    cache: 'no-store',
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data.message || 'That request could not be completed.')
    error.status = response.status
    error.code = data.code
    throw error
  }

  return data
}

function initialOf(name) {
  return String(name || '?').trim().charAt(0).toUpperCase() || '?'
}

function RoleBadge({ role }) {
  if (!role) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
        No role
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-bold text-[#007a99]">
      <Shield size={12} />
      {role.name}
    </span>
  )
}

/**
 * The permission matrix.
 *
 * Each permission shows what the account can *actually* do, and the badge beside
 * it says where that came from. Clicking the box flips the effective answer and
 * writes an override only when the answer now disagrees with the role - so
 * ticking a box that the role already grants does not quietly create a
 * pointless override, and unticking one records a real removal.
 *
 * A permission the signed-in admin does not hold is shown but cannot be handed
 * out, because the server would refuse it. Seeing it greyed out with the reason
 * is clearer than having the row disappear.
 */
function PermissionMatrix({ groups, permissions, selected, roleGrants, grantable, disabled, onToggle }) {
  const grantableSet = useMemo(() => new Set(grantable), [grantable])

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const rows = permissions.filter((permission) => permission.group === group.key)
        if (!rows.length) return null

        const granted = rows.filter((row) => selected.has(row.key)).length

        return (
          <section key={group.key} className="overflow-hidden rounded-2xl border border-slate-200">
            <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
              <h3 className="text-sm font-bold text-slate-800">{group.label}</h3>
              <span className="text-xs font-semibold text-slate-500">
                {granted} of {rows.length}
              </span>
            </header>

            <ul className="divide-y divide-slate-100">
              {rows.map((permission) => {
                const isOn = selected.has(permission.key)
                const roleHas = roleGrants.has(permission.key)
                const canGrant = grantableSet.has(permission.key)
                const locked = disabled || !canGrant

                const origin = isOn === roleHas
                  ? roleHas
                    ? 'From role'
                    : null
                  : isOn
                    ? 'Added'
                    : 'Removed'

                return (
                  <li key={permission.key} className={locked ? 'opacity-60' : ''}>
                    <label
                      className={[
                        'flex cursor-pointer items-start gap-3 px-4 py-3 transition',
                        locked ? 'cursor-not-allowed' : 'hover:bg-slate-50/70',
                      ].join(' ')}
                    >
                      <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={isOn}
                          disabled={locked}
                          onChange={() => !locked && onToggle(permission.key)}
                        />
                        <span
                          className={[
                            'flex h-5 w-5 items-center justify-center rounded-md border transition',
                            isOn
                              ? 'border-[#0092B8] bg-[#0092B8] text-white'
                              : 'border-slate-300 bg-white text-transparent',
                            locked ? '' : 'peer-focus-visible:ring-4 peer-focus-visible:ring-cyan-100',
                          ].join(' ')}
                        >
                          <Check size={13} strokeWidth={3} />
                        </span>
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {permission.name}
                          </span>

                          {origin && (
                            <span
                              className={[
                                'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                                origin === 'Added'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : origin === 'Removed'
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-slate-100 text-slate-500',
                              ].join(' ')}
                            >
                              {origin}
                            </span>
                          )}

                          {!canGrant && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                              Beyond your own access
                            </span>
                          )}
                        </span>

                        <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                          {permission.description}
                        </span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function Modal({ title, eyebrow, onClose, children, footer, wide = false }) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        className={[
          'flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl',
          wide ? 'max-w-3xl' : 'max-w-xl',
        ].join(' ')}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0092B8]">{eyebrow}</p>
            )}
            <h2 className="mt-1 text-lg font-bold text-slate-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>

        {footer && <div className="border-t border-slate-100 p-4 sm:px-6">{footer}</div>}
      </section>
    </div>
  )
}

/**
 * Creating a role.
 *
 * The permission list starts from the role HR picks as a starting point rather
 * than from nothing, because the common case is "almost the same as Payroll
 * Staff, but also X". Permissions this admin does not hold are shown but cannot
 * be ticked - the server would refuse them, and a checkbox that lies is worse
 * than a disabled one.
 */
function CreateRoleModal({ catalogue, onClose, onCreated, creating, error, onCreate }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [baseRoleKey, setBaseRoleKey] = useState('')
  const [selected, setSelected] = useState(() => new Set())

  const grantable = useMemo(() => new Set(catalogue?.grantable || []), [catalogue])
  const roles = catalogue?.roles || []

  // Pick up the chosen starting point's grants, but only the ones this admin
  // can actually hand out, so the checkbox state is never something the server
  // would reject.
  useEffect(() => {
    const base = roles.find((role) => role.key === baseRoleKey)
    setSelected(new Set((base?.permissions || []).filter((key) => grantable.has(key))))
  }, [baseRoleKey, roles, grantable])

  function toggle(key) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const withheld = selected.size === 0

  return (
    <Modal
      wide
      title="Create a new role"
      eyebrow="User & Role Management"
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-xs text-slate-500">
            {withheld
              ? 'Nothing granted yet.'
              : `${selected.size} permission${selected.size === 1 ? '' : 's'} selected.`}
          </p>
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              disabled={creating}
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={creating || !name.trim()}
              onClick={() => onCreate({ name: name.trim(), description: description.trim(), permissions: [...selected] })}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0092B8] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#007a99] disabled:opacity-50"
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              {creating ? 'Creating…' : 'Create role'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">Role name</span>
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Payroll Reviewer"
            maxLength={80}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#0092B8] focus:ring-2 focus:ring-cyan-100"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            maxLength={400}
            placeholder="What is this role responsible for?"
            className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#0092B8] focus:ring-2 focus:ring-cyan-100"
          />
        </label>

        <div>
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">
            Start from an existing role
          </span>
          <select
            value={baseRoleKey}
            onChange={(event) => setBaseRoleKey(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0092B8] focus:ring-2 focus:ring-cyan-100"
          >
            <option value="">Start from nothing</option>
            {roles
              .filter((role) => !role.isProtected)
              .map((role) => (
                <option key={role.key} value={role.key}>
                  {role.name}
                </option>
              ))}
          </select>
          <p className="mt-1.5 text-xs text-slate-500">
            Copies that role&rsquo;s permissions, minus anything you do not hold. Then tick or
            untick below.
          </p>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">
            What this role grants
          </span>
          <PermissionMatrix
            groups={catalogue.groups}
            permissions={catalogue.permissions}
            selected={selected}
            roleGrants={new Set()}
            grantable={catalogue.grantable}
            disabled={false}
            onToggle={toggle}
          />
        </div>
      </div>
    </Modal>
  )
}

/**
 * Create an HR staff account, then optionally a role and a set of permissions.
 *
 * Ordered the way the work actually happens: who the person is, what role they
 * hold, and what that role may do. Creating the role is a separate request and
 * a separate step on purpose - a role outlives the account it was made for, and
 * an admin who invents a good one will want to reuse it for the next person.
 */
function CreateHrUserModal({ catalogue, onClose, onCreated, onRoleCreated }) {
  const [form, setForm] = useState({ name: '', email: '', roleKey: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Inline role creation, driven by the same handlers the page uses so the two
  // entry points cannot drift apart.
  const [roleCreating, setRoleCreating] = useState(false)
  const [roleError, setRoleError] = useState('')
  const [roleOpen, setRoleOpen] = useState(false)

  const [created, setCreated] = useState(null)

  const grantableSet = useMemo(() => new Set(catalogue?.grantable || []), [catalogue])

  const assignableRoles = useMemo(() => {
    const roles = catalogue?.roles || []
    return roles.filter((role) => role.permissions.every((key) => grantableSet.has(key)))
  }, [catalogue, grantableSet])

  useEffect(() => {
    if (!form.roleKey && assignableRoles.length) {
      setForm((current) => ({ ...current, roleKey: assignableRoles[0].key }))
    }
  }, [assignableRoles, form.roleKey])

  const selectedRole = assignableRoles.find((role) => role.key === form.roleKey)

  async function createRole(payload) {
    setRoleCreating(true)
    setRoleError('')

    try {
      const result = await request('/rbac/roles', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      // Add it to the in-memory catalogue so it is immediately selectable, and
      // select it - the admin just described it, so that is the role they meant.
      const role = { ...result.role, permissions: result.role.permissions || [] }
      setForm((current) => ({ ...current, roleKey: role.key }))
      onRoleCreated((catalogue?.roles || []).filter((item) => item.key !== role.key).concat(role))
      setRoleOpen(false)

      return role
    } catch (createError) {
      setRoleError(createError.message || 'Unable to create the role.')
      return null
    } finally {
      setRoleCreating(false)
    }
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const result = await request('/hr-users', {
        method: 'POST',
        body: JSON.stringify(form),
      })

      setCreated(result)
    } catch (submitError) {
      setError(submitError.message || 'Unable to create the account.')
    } finally {
      setSaving(false)
    }
  }

  // ── Step two: the permissions, once the account exists ──────────────────
  //
  // The account is already created at this point, so the step reuses the same
  // PermissionsModal the staff list uses rather than growing a second copy of
  // the matrix and its override rules. The temporary password is carried in
  // `created` and handed on only once this step finishes, so a failure here
  // cannot cost the admin the only copy of it.
  if (created) {
    return (
      <PermissionsModal
        user={created.user}
        catalogue={catalogue}
        canManage
        onClose={() => {
          setCreated(null)
          onCreated(created)
        }}
        onSaved={(user) => {
          setCreated(null)
          onCreated({ ...created, user })
        }}
      />
    )
  }

  return (
    <>
      <Modal
        wide
        title="Create HR staff account"
        eyebrow="User & Role Management"
        onClose={onClose}
        footer={
          <div className="flex flex-col-reverse items-center gap-2 sm:flex-row sm:justify-between">
            <p className="text-xs text-slate-500">
              Step 1 of 2 &mdash; the permissions can be tuned next.
            </p>
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              <button
                type="button"
                disabled={saving}
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-hr-user"
                disabled={saving || !form.name.trim() || !form.email.trim() || !form.roleKey}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0092B8] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#007a99] disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {saving ? 'Creating…' : 'Create account'}
              </button>
            </div>
          </div>
        }
      >
        <form id="create-hr-user" onSubmit={submit} className="space-y-4">
          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Full name</span>
            <input
              autoFocus
              required
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="e.g. Hana Bekele"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#0092B8] focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Work email</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="name@company.com"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#0092B8] focus:ring-2 focus:ring-cyan-100"
            />
            <span className="mt-1 block text-xs text-slate-500">
              This becomes the sign-in address. The temporary password is shown to you here.
            </span>
          </label>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600">Role</span>
              <button
                type="button"
                onClick={() => {
                  setRoleError('')
                  setRoleOpen(true)
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
              >
                <Plus size={12} />
                Create a new role
              </button>
            </div>

            <div className="space-y-2">
              {assignableRoles.map((role) => (
                <label
                  key={role.key}
                  className={[
                    'flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition',
                    form.roleKey === role.key
                      ? 'border-[#0092B8] bg-cyan-50/50 ring-2 ring-cyan-100'
                      : 'border-slate-200 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="roleKey"
                    className="mt-1"
                    checked={form.roleKey === role.key}
                    onChange={() => setForm((current) => ({ ...current, roleKey: role.key }))}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">{role.name}</span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
                        {role.permissions.length} permission{role.permissions.length === 1 ? '' : 's'}
                      </span>
                      {!role.isSystem && (
                        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 ring-1 ring-violet-200">
                          Custom
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">{role.description}</span>
                  </span>
                </label>
              ))}
            </div>

            {selectedRole && (
              <p className="mt-2 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                <Info className="mt-0.5 shrink-0 text-slate-400" size={14} />
                {selectedRole.isSystem
                  ? `On the next step you can give ${created?.user?.name || 'this person'} permissions that differ from ${selectedRole.name}.`
                  : `This is a role you created. Its ${selectedRole.permissions.length} permission(s) can still be changed from the Roles tab.`}
              </p>
            )}

            {!assignableRoles.length && (
              <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                No role is within your own access, so you cannot create an account right now.
              </p>
            )}
          </div>
        </form>
      </Modal>

      {roleOpen && (
        <CreateRoleModal
          catalogue={catalogue}
          creating={roleCreating}
          error={roleError}
          onClose={() => setRoleOpen(false)}
          onCreate={createRole}
        />
      )}
    </>
  )
}

function TemporaryPasswordModal({ result, onClose }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(result.temporaryPassword)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Modal
      title="Temporary password"
      eyebrow={result.title || 'Account access'}
      onClose={onClose}
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      }
    >
      <p className="text-sm leading-6 text-slate-600">
        Share this with <strong className="text-slate-800">{result.email}</strong>. They will be asked
        to choose their own password the first time they sign in. It is not shown again, and nothing
        was emailed.
      </p>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <code className="min-w-0 flex-1 break-all font-mono text-sm font-bold text-slate-900">
          {result.temporaryPassword}
        </code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
        >
          {copied ? <Check size={13} /> : <KeyRound size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </Modal>
  )
}

function PermissionsModal({ user, catalogue, onClose, onSaved, canManage }) {
  const roleGrants = useMemo(() => {
    const role = (catalogue?.roles || []).find((item) => item.key === user.hrRole?.key)
    return new Set(role?.permissions || [])
  }, [catalogue, user])

  // Start from what the account currently has, then let the admin move each
  // answer; the overrides that get written are only the differences from the
  // role, which is what keeps the stored state readable.
  const [selected, setSelected] = useState(() => {
    const initial = new Set()
    for (const permission of (user.permissions || [])) initial.add(permission)
    return initial
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggle(key) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function save() {
    setSaving(true)
    setError('')

    const overrides = {}
    for (const permission of catalogue.permissions) {
      const isOn = selected.has(permission.key)
      const roleHas = roleGrants.has(permission.key)
      if (isOn === roleHas) continue
      overrides[permission.key] = isOn ? 'ALLOW' : 'DENY'
    }

    try {
      const result = await request(`/hr-users/${user.id}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ overrides }),
      })
      onSaved(result.user)
    } catch (saveError) {
      setError(saveError.message || 'Unable to save permissions.')
    } finally {
      setSaving(false)
    }
  }

  const changed = useMemo(() => {
    let count = 0
    for (const permission of catalogue.permissions) {
      const isOn = selected.has(permission.key)
      if (isOn !== roleGrants.has(permission.key)) count += 1
    }
    return count
  }, [selected, roleGrants, catalogue])

  return (
    <Modal
      wide
      title={`${user.name}'s permissions`}
      eyebrow={user.hrRole?.name || 'HR staff'}
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-xs text-slate-500">
            {changed === 0
              ? 'Matching the role exactly.'
              : `${changed} change${changed === 1 ? '' : 's'} from the role.`}
          </p>
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || !canManage}
              onClick={save}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0092B8] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#007a99] disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {saving ? 'Saving…' : 'Save permissions'}
            </button>
          </div>
        </div>
      }
    >
      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!canManage && (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
          <Lock className="mt-0.5 shrink-0" size={14} />
          You can see this account&rsquo;s access, but changing permissions needs the
          &ldquo;Manage permissions&rdquo; permission.
        </p>
      )}

      <PermissionMatrix
        groups={catalogue.groups}
        permissions={catalogue.permissions}
        selected={selected}
        roleGrants={roleGrants}
        grantable={catalogue.grantable}
        disabled={!canManage}
        onToggle={toggle}
      />
    </Modal>
  )
}

function EditHrUserModal({ user, catalogue, onClose, onSaved, canEdit, canManage }) {
  const [name, setName] = useState(user.name)
  const [roleKey, setRoleKey] = useState(user.hrRole?.key || '')
  const [isActive, setIsActive] = useState(user.isActive !== false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const grantableSet = useMemo(() => new Set(catalogue?.grantable || []), [catalogue])
  const roles = catalogue?.roles || []

  async function save() {
    setSaving(true)
    setError('')

    const payload = {}
    if (name.trim() !== user.name) payload.name = name.trim()
    if (roleKey && roleKey !== user.hrRole?.key) payload.roleKey = roleKey
    if (isActive !== (user.isActive !== false)) payload.isActive = isActive

    if (!Object.keys(payload).length) {
      onClose()
      return
    }

    try {
      const result = await request(`/hr-users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      onSaved(result.user)
    } catch (saveError) {
      setError(saveError.message || 'Unable to save changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Edit ${user.name}`}
      eyebrow="HR staff account"
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !canEdit}
            onClick={save}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0092B8] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#007a99] disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      }
    >
      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">Full name</span>
          <input
            value={name}
            disabled={!canEdit}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#0092B8] focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-50 disabled:text-slate-500"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">Sign-in email</span>
          <input
            value={user.email}
            disabled
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-500"
          />
          <span className="mt-1 block text-xs text-slate-500">
            Not editable here: changing a sign-in address goes through the
            &ldquo;pending email&rdquo; confirmation flow so a typo cannot lock anyone out.
          </span>
        </label>

        <div>
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">Role</span>
          <select
            value={roleKey}
            disabled={!canManage}
            onChange={(event) => setRoleKey(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#0092B8] disabled:bg-slate-50 disabled:text-slate-500"
          >
            {roles.map((role) => (
              <option key={role.key} value={role.key} disabled={!role.permissions.every((key) => grantableSet.has(key))}>
                {role.name}
                {role.permissions.every((key) => grantableSet.has(key)) ? '' : ' — beyond your access'}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-slate-500">
            Changing the role changes every permission at once. Individual tweaks are under
            &ldquo;Permissions&rdquo;.
          </span>
        </div>

        <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3.5 py-3">
          <span>
            <span className="block text-sm font-semibold text-slate-800">Account active</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Switching this off blocks sign-in immediately, without deleting anything.
            </span>
          </span>
          <input
            type="checkbox"
            checked={isActive}
            disabled={!canEdit}
            onChange={(event) => setIsActive(event.target.checked)}
            className="h-5 w-5"
          />
        </label>
      </div>
    </Modal>
  )
}

function RoleEditorModal({ role, catalogue, onClose, onSaved }) {
  const [selected, setSelected] = useState(() => new Set(role.permissions))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // The badges compare against the role's saved state, so an edit in progress
  // shows exactly which permissions it is adding or taking away. Whether the
  // actor is allowed to grant each one is enforced separately, by `grantable`.
  const savedGrants = useMemo(() => new Set(role.permissions), [role])

  function toggle(key) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function save() {
    setSaving(true)
    setError('')

    try {
      await request(`/rbac/roles/${encodeURIComponent(role.key)}`, {
        method: 'PUT',
        body: JSON.stringify({ permissions: [...selected] }),
      })
      onSaved()
    } catch (saveError) {
      setError(saveError.message || 'Unable to save the role.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      wide
      title={`${role.name} permissions`}
      eyebrow="Role defaults"
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-xs text-slate-500">
            {selected.size} permission{selected.size === 1 ? '' : 's'} granted to every{' '}
            {role.name}.
          </p>
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0092B8] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#007a99] disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {saving ? 'Saving…' : 'Save role'}
            </button>
          </div>
        </div>
      }
    >
      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <p className="mb-4 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
        <Info className="mt-0.5 shrink-0 text-slate-400" size={14} />
        This changes the role for everyone who holds it. A change takes effect on their next request,
        not at their next sign-in.
      </p>

      <PermissionMatrix
        groups={catalogue.groups}
        permissions={catalogue.permissions}
        selected={selected}
        roleGrants={savedGrants}
        grantable={catalogue.grantable}
        onToggle={toggle}
      />
    </Modal>
  )
}

function RolesPanel({ catalogue, onChanged }) {
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [roleCreating, setRoleCreating] = useState(false)
  const [roleError, setRoleError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function createRole(payload) {
    setRoleCreating(true)
    setRoleError('')

    try {
      await request('/rbac/roles', { method: 'POST', body: JSON.stringify(payload) })
      setCreating(false)
      onChanged()
    } catch (createError) {
      setRoleError(createError.message || 'Unable to create the role.')
    } finally {
      setRoleCreating(false)
    }
  }

  async function deleteRole(role) {
    setDeleting(true)
    setDeleteError('')

    try {
      await request('/rbac/roles/' + encodeURIComponent(role.key), { method: 'DELETE' })
      setConfirmDelete(null)
      onChanged()
    } catch (err) {
      setDeleteError(err.message || 'Unable to delete role.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          A role is a named set of permissions. Roles can be created, customized, and deleted dynamically.
        </p>
        <Can permission="users.permissions">
          <button
            type="button"
            onClick={() => {
              setRoleError('')
              setCreating(true)
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0092B8] px-3.5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#007a99]"
          >
            <Plus size={14} />
            New role
          </button>
        </Can>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(catalogue?.roles || []).map((role) => (
          <article
            key={role.key}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-[#0092B8]">
                  {role.isProtected ? <Lock size={16} /> : <Shield size={16} />}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{role.name}</h3>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {role.permissions.length} permission{role.permissions.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-3 flex-1 text-xs leading-5 text-slate-500">{role.description || 'No description provided.'}</p>

            <div className="mt-4">
              {role.isProtected ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
                  <Lock size={13} />
                  Protected system role
                </span>
              ) : (
                <Can permission="users.permissions">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(role)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      <Pencil size={13} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError('')
                        setConfirmDelete(role)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                      title="Delete role"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </div>
                </Can>
              )}
            </div>
          </article>
        ))}
      </div>

      {editing && (
        <RoleEditorModal
          role={editing}
          catalogue={catalogue}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            onChanged()
          }}
        />
      )}

      {creating && (
        <CreateRoleModal
          catalogue={catalogue}
          creating={roleCreating}
          error={roleError}
          onClose={() => setCreating(false)}
          onCreate={createRole}
        />
      )}

      {confirmDelete && (
        <Modal
          title={'Delete ' + confirmDelete.name + ' role'}
          eyebrow="Confirm deletion"
          onClose={() => !deleting && setConfirmDelete(null)}
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => deleteRole(confirmDelete)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? 'Deleting…' : 'Delete role'}
              </button>
            </div>
          }
        >
          {deleteError && (
            <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {deleteError}
            </p>
          )}
          <p className="text-sm text-slate-600">
            Are you sure you want to delete the <strong className="text-slate-900">{confirmDelete.name}</strong> role?
            This will permanently remove the role.
          </p>
        </Modal>
      )}
    </>
  )
}

export default function UserRoles() {
  const [catalogue, setCatalogue] = useState(null)
  const [users, setUsers] = useState([])
  const [tab, setTab] = useState('users')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [permissionsFor, setPermissionsFor] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [temporaryPassword, setTemporaryPassword] = useState(null)
  const [busy, setBusy] = useState(false)

  // The buttons are wrapped in <Can>, and the modals are told the same answer so
  // a disabled control and a refused request always agree.
  const { can } = useAccess()
  const canEdit = can('users.edit')
  const canManage = can('users.permissions')

  const load = useCallback(async () => {
    try {
      const data = await request('/rbac/catalogue')
      setCatalogue(data)
    } catch (loadError) {
      setError(loadError.message || 'Unable to load the permission catalogue.')
    }

    try {
      const accounts = await request('/hr-users')
      setUsers(Array.isArray(accounts) ? accounts : [])
    } catch (loadError) {
      setError(loadError.message || 'Unable to load HR users.')
    }
  }, [])

  useEffect(() => {
    let active = true
    load().finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [load])

  // Any change here can change what this admin can do too, so the layout is
  // told to re-read the account rather than waiting for the next page load.
  function broadcast() {
    window.dispatchEvent(new CustomEvent('hr-permissions-updated'))
  }

  function upsertUser(user) {
    setUsers((current) => {
      const exists = current.some((item) => item.id === user.id)
      const next = exists
        ? current.map((item) => (item.id === user.id ? user : item))
        : [...current, user]
      return next.sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.id - b.id)
    })
  }

  async function resetPassword(user) {
    setBusy(true)
    setError('')

    try {
      const result = await request(`/hr-users/${user.id}/reset-password`, { method: 'POST' })
      setTemporaryPassword({ ...result, title: `New password for ${user.name}` })
    } catch (resetError) {
      setError(resetError.message || 'Unable to reset the password.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(user) {
    setBusy(true)
    setError('')

    try {
      const result = await request(`/hr-users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !(user.isActive !== false) }),
      })
      upsertUser(result.user)
      setNotice(result.message || 'Account updated.')
    } catch (toggleError) {
      setError(toggleError.message || 'Unable to change the account state.')
    } finally {
      setBusy(false)
    }
  }

  async function deleteUser() {
    if (!confirmDelete) return
    setBusy(true)
    setError('')

    try {
      await request(`/hr-users/${confirmDelete.id}`, { method: 'DELETE' })
      setUsers((current) => current.filter((item) => item.id !== confirmDelete.id))
      setNotice(`${confirmDelete.name}'s access was removed.`)
      setConfirmDelete(null)
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to remove the account.')
    } finally {
      setBusy(false)
    }
  }

  const activeCount = users.filter((user) => user.isActive !== false).length

  return (
    <div className="min-h-full bg-[#F3F4F6] text-slate-950">
      <main className="w-full max-w-[1600px] px-5 py-6 sm:px-8">
        <PageTitle
          eyebrow="Access Control"
          title="User & Role Management"
          description="Manage HR accounts, team permissions, and customize role access across the system."
          className="animate-employee-hero mb-8 px-0 py-2"
          action={
            <Can permission="users.create">
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="animate-add-employee-button flex w-fit items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
              >
                <Plus size={17} />
                New HR Account
              </button>
            </Can>
          }
        />

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('users')}
            className={[
              'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition',
              tab === 'users'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            ].join(' ')}
          >
            <UserCheck size={15} />
            HR Staff
            <span className="rounded-full bg-white/15 px-2 text-[11px]">{users.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('roles')}
            className={[
              'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition',
              tab === 'roles'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            ].join(' ')}
          >
            <ShieldCheck size={15} />
            Roles &amp; Permissions
            <span className="rounded-full bg-white/15 px-2 text-[11px]">
              {(catalogue?.roles || []).length}
            </span>
          </button>

          <p className="ml-auto text-xs font-semibold text-slate-500">
            {activeCount} active of {users.length}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 shrink-0" size={17} />
            {error}
          </div>
        )}

        {notice && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span className="flex items-start gap-2">
              <Check className="mt-0.5 shrink-0" size={17} />
              {notice}
            </span>
            <button type="button" onClick={() => setNotice('')} aria-label="Dismiss">
              <X size={15} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-slate-200/80 bg-white">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
              <Loader2 size={17} className="animate-spin" />
              Loading access control…
            </span>
          </div>
        ) : tab === 'roles' ? (
          <RolesPanel catalogue={catalogue} onChanged={load} />
        ) : users.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-[#0092B8]">
              <ShieldCheck size={25} strokeWidth={1.8} />
            </div>
            <h2 className="mt-5 text-lg font-bold text-slate-900">No HR staff accounts yet</h2>
            <p className="mt-1.5 max-w-md text-sm text-slate-500">
              Create an account, choose a role, then adjust the permissions if the role needs
              tuning.
            </p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
            <ul className="divide-y divide-slate-100">
              {users.map((user) => (
                <li key={user.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                      {initialOf(user.name)}
                    </span>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-slate-900">{user.name}</h3>
                        <RoleBadge role={user.hrRole} />
                        {user.isActive === false ? (
                          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700">
                            Deactivated
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                            Active
                          </span>
                        )}
                        {user.mustChangePassword && (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                            Temporary password
                          </span>
                        )}
                      </div>

                      <p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className="mr-1 text-xs font-semibold text-slate-500">
                      {(user.permissions || []).length} permission
                      {(user.permissions || []).length === 1 ? '' : 's'}
                    </span>

                    <Can permission="users.edit">
                      <button
                        type="button"
                        onClick={() => setEditing(user)}
                        title="Edit account"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        <Pencil size={13} />
                        Edit
                      </button>
                    </Can>

                    <Can anyOf={['users.permissions', 'users.view']}>
                      <button
                        type="button"
                        onClick={() => setPermissionsFor(user)}
                        title="View or change permissions"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        <Shield size={13} />
                        Permissions
                      </button>
                    </Can>

                    <Can permission="users.edit">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => resetPassword(user)}
                        title="Reset password"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <KeyRound size={13} />
                        Reset
                      </button>
                    </Can>

                    <Can permission="users.edit">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => toggleActive(user)}
                        title={user.isActive === false ? 'Reactivate' : 'Deactivate'}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {user.isActive === false ? <UserCheck size={13} /> : <UserX size={13} />}
                        {user.isActive === false ? 'Activate' : 'Deactivate'}
                      </button>
                    </Can>

                    <Can permission="users.delete">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmDelete(user)}
                        title="Remove access"
                        className="inline-flex items-center gap-1.5 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      >
                        <Trash2 size={15} />
                      </button>
                    </Can>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {createOpen && catalogue && (
        <CreateHrUserModal
          catalogue={catalogue}
          onClose={() => setCreateOpen(false)}
          onRoleCreated={(roles) => setCatalogue((current) => ({ ...current, roles }))}
          onCreated={(result) => {
            setCreateOpen(false)
            upsertUser(result.user)
            setNotice(result.message || 'Account created.')
            setTemporaryPassword({
              email: result.user.email,
              temporaryPassword: result.temporaryPassword,
              title: `Password for ${result.user.name}`,
            })
            broadcast()
          }}
        />
      )}

      {editing && catalogue && (
        <EditHrUserModal
          user={editing}
          catalogue={catalogue}
          onClose={() => setEditing(null)}
          onSaved={(user) => {
            setEditing(null)
            upsertUser(user)
            setNotice('Account updated.')
            broadcast()
          }}
          canEdit={canEdit}
          canManage={canManage}
        />
      )}

      {permissionsFor && catalogue && (
        <PermissionsModal
          user={permissionsFor}
          catalogue={catalogue}
          onClose={() => setPermissionsFor(null)}
          onSaved={(user) => {
            setPermissionsFor(null)
            upsertUser(user)
            setNotice('Permissions updated.')
            broadcast()
          }}
          canManage={canManage}
        />
      )}

      {temporaryPassword && (
        <TemporaryPasswordModal
          result={temporaryPassword}
          onClose={() => setTemporaryPassword(null)}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4">
          <section
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 className="text-lg font-bold text-slate-900">Remove HR access?</h2>
            <p className="mt-2 text-sm text-slate-600">
              {confirmDelete.name} will lose the ability to sign in immediately. Their employee
              record, if they have one, is not touched.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={deleteUser}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? 'Removing…' : 'Remove access'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
