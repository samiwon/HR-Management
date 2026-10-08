import { useState, useMemo, useEffect } from 'react'
import {
  CircleUserRound,
  Palette,
  Bell,
  KeyRound,
  Globe,
  Save,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Monitor,
  Building2,
  ShieldCheck,
  ChevronRight,
  Loader2,
  CheckCircle2,
  SlidersHorizontal,
  Link2,
  FileText,
  Upload,
  Download,
  Camera,
  RefreshCw,
} from 'lucide-react'
import { useTheme } from '../../lib/theme'
import { getCurrentUser, resolveEmployee } from '../lib/currentUser'
import {
  fetchEmployees,
  fetchMyEmployeeProfile,
  uploadMyResume,
  downloadMyResume,
  uploadMyStatusDocument,
  downloadMyStatusDocument,
  updateMyEmployeeProfile,
  uploadEmployeeDocument,
  downloadEmployeeDocument,
  deleteEmployeeDocument,
} from '../lib/employerApi'
import { fetchMe, updateProfileApi, changePasswordApi } from '../lib/userApi'

// ── Small building blocks ────────────────────────────────────────────────────

function Label({ children }) {
  return (
    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
      {children}
    </label>
  )
}

function TextInput({ value, onChange, type = 'text', placeholder, disabled, className = '' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full px-3 py-2 text-xs border border-gray-200 dark:border-[#33383f] rounded-lg bg-white dark:bg-[#15181d] dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    />
  )
}

function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className="fixed top-5 right-5 z-50 bg-gray-950 text-white dark:bg-[#3a4149] px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium animate-in fade-in duration-200">
      {toast}
    </div>
  )
}

function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{label}</p>
        {description && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-9 h-5 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          checked ? 'bg-gray-950 dark:bg-[#3a4149]' : 'bg-gray-200 dark:bg-[#33383f]'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </button>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={15} className="text-gray-500 dark:text-gray-400" />}
        <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100">{title}</h3>
      </div>
      {description && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      )}
    </div>
  )
}

function Card({ children }) {
  return (
    <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs p-6">
      {children}
    </div>
  )
}

// ── Sections ─────────────────────────────────────────────────────────────────

function PersonalInfoSection({
  user,
  employee,
  loading,
  onSave,
  onSaveProfessionalProfile,
  onUploadResume,
  onDownloadResume,
  resumeUploading,
  onUploadDoc,
  onDownloadDoc,
  onDeleteDoc,
  docUploading,
  onUploadStatusDocument,
  onDownloadStatusDocument,
  statusUploading,
  onUploadPhoto,
  photoUploading,
  saving,
}) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    tin: '',
    pensionId: '',
    githubUrl: '',
    linkedinUrl: '',
    portfolioUrl: '',
    skills: '',
  })
  const [documentToDelete, setDocumentToDelete] = useState(null)

  useEffect(() => {
    setForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: employee?.phone || '',
      tin: employee?.tin || '',
      pensionId: employee?.pensionId || '',
      githubUrl: employee?.githubUrl || '',
      linkedinUrl: employee?.linkedinUrl || '',
      portfolioUrl: employee?.portfolioUrl || '',
      skills: employee?.skills || '',
    })
  }, [user, employee])

  // Name and email live on the user account; the two identifiers live on the
  // employee record. Both are saved by the same button, so the dirty check has
  // to cover both or the button would stay greyed out with edits made.
  const identityDirty = useMemo(
    () =>
      form.name !== (user?.name || '') ||
      form.email !== (user?.email || '') ||
      form.tin !== (employee?.tin || '') ||
      form.pensionId !== (employee?.pensionId || ''),
    [form.name, form.email, form.tin, form.pensionId, user, employee],
  )
  const professionalProfileDirty = useMemo(
    () =>
      form.githubUrl !== (employee?.githubUrl || '') ||
      form.linkedinUrl !== (employee?.linkedinUrl || '') ||
      form.portfolioUrl !== (employee?.portfolioUrl || '') ||
      form.skills !== (employee?.skills || ''),
    [form.githubUrl, form.linkedinUrl, form.portfolioUrl, form.skills, employee],
  )

  const set = (field) => (v) => setForm((p) => ({ ...p, [field]: v }))

  return (
    <div className="space-y-5">
      {/* Identity card */}
      <Card>
        <SectionHeader
          icon={CircleUserRound}
          title="Who you are"
          description="How your account appears across Yanol-HR — dashboards, messaging and approvals."
        />
        <div className="mb-5 flex flex-wrap items-center gap-4 border-b border-gray-100 pb-5 dark:border-[#262b31]">
          <div className="relative h-16 w-16 shrink-0">
            {employee?.avatar ? <img src={employee.avatar} alt={`${form.name || 'Employee'} profile`} className="h-16 w-16 rounded-full object-cover ring-2 ring-gray-100 dark:ring-[#33383f]" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-950 text-lg font-bold text-white shadow-sm dark:bg-[#3a4149] dark:text-gray-100">{(form.name || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?'}</div>}
            <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-[#0092B8] text-white shadow dark:border-[#15181d]" title="Change profile photo">
              {photoUploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={photoUploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) onUploadPhoto(file); event.target.value = '' }} />
            </label>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-950 dark:text-gray-100 truncate">
              {user?.name || '—'}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              {[employee?.jobTitle, employee?.department].filter(Boolean).join(' · ') ||
                'Employee'}
            </p>
            <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <ShieldCheck size={10} /> {employee?.employmentStatus || 'Active'}
            </span>
            <p className="mt-1 text-[10px] text-gray-400">Click the camera to change your profile photo (PNG, JPG, or WebP · max 2 MB).</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 py-4">
            <Loader2 size={14} className="animate-spin" /> Loading your details…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <TextInput value={form.name} onChange={set('name')} placeholder="Your name" />
              </div>
              <div>
                <Label>Email</Label>
                <TextInput value={form.email} onChange={set('email')} type="email" />
              </div>
              <div>
                <Label>Phone</Label>
                <TextInput
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="Not on file"
                  disabled
                />
              </div>
              <div>
                <Label>Employee ID</Label>
                <TextInput value={employee?.employeeId || '—'} disabled />
              </div>
              <div>
                <Label>TIN</Label>
                <TextInput
                  value={form.tin}
                  onChange={set('tin')}
                  placeholder="e.g. 0001234567"
                  maxLength={32}
                />
              </div>
              <div>
                <Label>Pension ID</Label>
                <TextInput
                  value={form.pensionId}
                  onChange={set('pensionId')}
                  placeholder="e.g. PEN-20481"
                  maxLength={32}
                />
              </div>
            </div>
            <p className="mt-3 text-[10px] text-gray-400">
              Your TIN and pension ID are yours to correct. If HR has already used these
              identifiers for payroll or pension deductions, check the change with them
              first.
            </p>
            <div className="flex justify-end mt-5">
              <button
                onClick={() => onSave(form)}
                disabled={saving || !identityDirty}
                className="px-5 py-2.5 rounded-xl bg-gray-950 text-white dark:bg-[#3a4149] dark:hover:bg-gray-600 text-xs font-semibold hover:bg-gray-800 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </Card>

      <Card>
        <SectionHeader
          icon={Link2}
          title="Professional Profile"
          description="Share your professional links and current skills with the HR team."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>GitHub profile</Label>
            <TextInput
              type="url"
              value={form.githubUrl}
              onChange={set('githubUrl')}
              placeholder="https://github.com/yourname"
            />
          </div>
          <div>
            <Label>LinkedIn profile</Label>
            <TextInput
              type="url"
              value={form.linkedinUrl}
              onChange={set('linkedinUrl')}
              placeholder="https://www.linkedin.com/in/yourname"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Portfolio or website</Label>
            <TextInput
              type="url"
              value={form.portfolioUrl}
              onChange={set('portfolioUrl')}
              placeholder="https://your-portfolio.com"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Skills</Label>
            <textarea
              value={form.skills}
              onChange={(event) => set('skills')(event.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="Add skills separated by commas or new lines"
              className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-[#33383f] rounded-lg bg-white dark:bg-[#15181d] dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-400 transition-colors resize-y"
            />
          </div>
        </div>
        <div className="mt-5 border-t border-gray-100 pt-5 dark:border-[#262b31]">
          <SectionHeader
            icon={FileText}
            title="Employee Documents"
            description="Upload your CV, certificates, ID documents, and other important files."
          />
          <div className="space-y-3">
            {(employee?.documents || []).length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">No documents uploaded</p>
            ) : (
              (employee?.documents || []).map(doc => (
                <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 dark:bg-[#1c2026] p-3 rounded-lg border border-gray-200 dark:border-[#33383f] gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-gray-900 dark:text-gray-100">
                      {doc.title}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                      {(doc.fileSize / (1024 * 1024)).toFixed(2)} MB • {doc.mimeType}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onDownloadDoc(doc.id, doc.fileName)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-white dark:border-[#33383f] dark:text-gray-200 dark:hover:bg-[#15181d]"
                    >
                      <Download size={14} /> Download
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocumentToDelete(doc.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-900/50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gray-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-800 dark:bg-[#3a4149] dark:hover:bg-gray-600 shadow-sm">
              {docUploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              {docUploading ? 'Uploading…' : 'Add Document'}
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                disabled={docUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) onUploadDoc(file)
                  event.target.value = ''
                }}
              />
            </label>
          </div>
          <p className="mt-3 text-[10px] text-gray-400">Maximum file size: 10 MB per file.</p>
        </div>



        <div className="flex justify-end mt-5">
          <button
            onClick={() => onSaveProfessionalProfile(form)}
            disabled={saving || !professionalProfileDirty}
            className="px-5 py-2.5 rounded-xl bg-gray-950 text-white dark:bg-[#3a4149] dark:hover:bg-gray-600 text-xs font-semibold hover:bg-gray-800 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </Card>

      {/* Work record (read-only) */}
      <Card>
        <SectionHeader
          icon={Building2}
          title="Work Record"
          description="Managed by HR — contact HR to correct anything here."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          {[
            ['Department', employee?.department],
            ['Job Title', employee?.jobTitle],
            ['Employment Type', employee?.employmentType],
            ['Joined', employee?.joinDate],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-[#1c2026] border border-gray-100 dark:border-[#262b31] rounded-lg px-3 py-2.5"
            >
              <span className="text-[11px] text-gray-500 dark:text-gray-400">{label}</span>
              <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                {value || '—'}
              </span>
            </div>
          ))}
        </div>
      </Card>
      {/* Delete Confirmation Modal */}
      {documentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-[#15181d] rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-gray-100 dark:border-[#262b31] animate-in fade-in zoom-in duration-200">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Delete Document</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Are you sure you want to delete this document? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDocumentToDelete(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-[#22262c] dark:hover:bg-[#2c3138] transition-colors">Cancel</button>
              <button onClick={() => { onDeleteDoc(documentToDelete); setDocumentToDelete(null) }} className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function PreferencesSection() {
  const { theme, setTheme } = useTheme()
  const PREFS_KEY = 'yanol-employee-prefs'

  const loadPrefs = () => {
    try {
      return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}
    } catch {
      return {}
    }
  }

  const [prefs, setPrefs] = useState(loadPrefs)

  const update = (key, value) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value }
      localStorage.setItem(PREFS_KEY, JSON.stringify(next))
      return next
    })
  }

  const themes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
  ]

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader
          icon={Palette}
          title="Appearance"
          description="Choose how Yanol-HR looks on this device."
        />
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          {themes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTheme(id)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-semibold transition-all ${
                theme === id
                  ? 'border-gray-950 dark:border-[#3a4149] bg-gray-950 text-white dark:bg-[#3a4149] dark:text-gray-100 shadow-sm'
                  : 'border-gray-200 dark:border-[#33383f] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1c2026]'
              }`}
            >
              <Icon size={15} />
              {label}
              {theme === id && <CheckCircle2 size={13} className="ml-auto opacity-70" />}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-3 flex items-center gap-1.5">
          <Monitor size={11} /> Follows the same theme used across the whole app.
        </p>
      </Card>

      <Card>
        <SectionHeader
          icon={SlidersHorizontal}
          title="Workspace Preferences"
          description="Small conveniences, saved on this device only."
        />
        <div className="divide-y divide-gray-50 dark:divide-[#262b31]">
          <Toggle
            checked={prefs.densityComfortable ?? true}
            onChange={(v) => update('densityComfortable', v)}
            label="Comfortable table density"
            description="Extra row padding in Payroll, Attendance and Reports tables."
          />
          <Toggle
            checked={prefs.emailNotifications ?? true}
            onChange={(v) => update('emailNotifications', v)}
            label="Email notifications"
            description="Get an email when leave requests you filed are approved or rejected."
          />
          <Toggle
            checked={prefs.payslipAlerts ?? true}
            onChange={(v) => update('payslipAlerts', v)}
            label="Payslip alerts"
            description="Notify me when a new payslip is published."
          />
          <Toggle
            checked={prefs.compactPunch ?? false}
            onChange={(v) => update('compactPunch', v)}
            label="Compact punch widget"
            description="Show a smaller check-in card on the dashboard."
          />
        </div>
      </Card>
    </div>
  )
}

function NotificationsSection() {
  const PREFS_KEY = 'yanol-employee-prefs'
  const [prefs, setPrefs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}
    } catch {
      return {}
    }
  })

  const update = (key, value) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value }
      localStorage.setItem(PREFS_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <Card>
      <SectionHeader
        icon={Bell}
        title="Notification Channels"
        description="Pick what you're told about and where."
      />
      <div className="divide-y divide-gray-50 dark:divide-[#262b31]">
        <Toggle
          checked={prefs.notifyLeave ?? true}
          onChange={(v) => update('notifyLeave', v)}
          label="Leave status updates"
          description="Approvals, rejections and comments on your requests."
        />
        <Toggle
          checked={prefs.notifyAttendance ?? false}
          onChange={(v) => update('notifyAttendance', v)}
          label="Attendance reminders"
          description="Nudge if you haven't checked in by the cut-off time."
        />
        <Toggle
          checked={prefs.notifyPayroll ?? true}
          onChange={(v) => update('notifyPayroll', v)}
          label="Payroll notices"
          description="When payroll is run and payslips become available."
        />
        <Toggle
          checked={prefs.notifyMessages ?? true}
          onChange={(v) => update('notifyMessages', v)}
          label="Inbox messages"
          description="New messages in your Yanol-HR inbox."
        />
      </div>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-4">
        These preferences are stored per-device in localStorage under "{PREFS_KEY}".
      </p>
    </Card>
  )
}

function SecuritySection({ showToast }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [show, setShow] = useState({ current: false, next: false })
  const [saving, setSaving] = useState(false)

  const set = (field) => (v) => setForm((p) => ({ ...p, [field]: v }))

  const strength = useMemo(() => {
    const pw = form.newPassword
    if (!pw) return 0
    let s = 0
    if (pw.length >= 8) s++
    if (pw.length >= 12) s++
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
    if (/\d/.test(pw)) s++
    if (/[^A-Za-z0-9]/.test(pw)) s++
    return s
  }, [form.newPassword])

  const strengthLabel = ['Too short', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'][strength]
  const strengthColor = ['bg-gray-200', 'bg-rose-500', 'bg-amber-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-emerald-600'][
    strength
  ]

  const submit = async (e) => {
    e.preventDefault()
    if (form.newPassword !== form.confirmPassword) {
      showToast('New passwords do not match')
      return
    }
    setSaving(true)
    try {
      const res = await changePasswordApi({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      showToast(res.message || 'Password updated successfully')
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      showToast(err.message || 'Could not update password')
    } finally {
      setSaving(false)
    }
  }

  const passwordInput = (field, showField) => (
    <div className="relative">
      <TextInput
        type={show[showField] ? 'text' : 'password'}
        value={form[field]}
        onChange={set(field)}
        placeholder={field === 'currentPassword' ? 'Enter current password' : 'At least 8 characters'}
        className="pr-9"
      />
      <button
        type="button"
        onClick={() => setShow((p) => ({ ...p, [showField]: !p[showField] }))}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        tabIndex={-1}
      >
        {show[showField] ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  )

  return (
    <Card>
      <SectionHeader
        icon={KeyRound}
        title="Change Password"
        description="Use at least 8 characters. You stay logged in on this device."
      />
      <form onSubmit={submit} className="space-y-4 max-w-md">
        <div>
          <Label>Current Password</Label>
          {passwordInput('currentPassword', 'current')}
        </div>
        <div>
          <Label>New Password</Label>
          {passwordInput('newPassword', 'next')}
        </div>
        {form.newPassword && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-[#262b31] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${strengthColor}`}
                style={{ width: `${(strength / 5) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-16">
              {strengthLabel}
            </span>
          </div>
        )}
        <div>
          <Label>Confirm New Password</Label>
          {passwordInput('confirmPassword', 'next')}
        </div>
        <button
          type="submit"
          disabled={saving || !form.currentPassword || !form.newPassword}
          className="px-5 py-2.5 rounded-xl bg-gray-950 text-white dark:bg-[#3a4149] dark:hover:bg-gray-600 text-xs font-semibold hover:bg-gray-800 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
          {saving ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </Card>
  )
}

function LanguageRegionSection() {
  const PREFS_KEY = 'yanol-employee-prefs'
  const [prefs, setPrefs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}
    } catch {
      return {}
    }
  })

  const update = (key, value) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value }
      localStorage.setItem(PREFS_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <Card>
      <SectionHeader
        icon={Globe}
        title="Language & Region"
        description="Formats for dates, numbers and currency across your workspace."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
        <div>
          <Label>Language</Label>
          <select
            value={prefs.language ?? 'en'}
            onChange={(e) => update('language', e.target.value)}
            className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-[#33383f] rounded-lg bg-white dark:bg-[#15181d] dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900/15"
          >
            <option value="en">English</option>
            <option value="am">አማርኛ (Amharic)</option>
            <option value="om">Afaan Oromoo</option>
          </select>
        </div>
        <div>
          <Label>Time Zone</Label>
          <select
            value={prefs.timezone ?? 'Africa/Addis_Ababa'}
            onChange={(e) => update('timezone', e.target.value)}
            className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-[#33383f] rounded-lg bg-white dark:bg-[#15181d] dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900/15"
          >
            <option value="Africa/Addis_Ababa">East Africa Time (Addis Ababa)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
        <div>
          <Label>Date Format</Label>
          <select
            value={prefs.dateFormat ?? 'd-m-yyyy'}
            onChange={(e) => update('dateFormat', e.target.value)}
            className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-[#33383f] rounded-lg bg-white dark:bg-[#15181d] dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900/15"
          >
            <option value="d-m-yyyy">DD-MM-YYYY</option>
            <option value="m-d-yyyy">MM-DD-YYYY</option>
            <option value="yyyy-m-d">YYYY-MM-DD</option>
          </select>
        </div>
        <div>
          <Label>Currency</Label>
          <select
            value={prefs.currency ?? 'ETB'}
            onChange={(e) => update('currency', e.target.value)}
            className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-[#33383f] rounded-lg bg-white dark:bg-[#15181d] dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900/15"
          >
            <option value="ETB">ETB — Ethiopian Birr</option>
            <option value="USD">USD — US Dollar</option>
          </select>
        </div>
      </div>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-4">
        Currency selection is a display preference — payroll is always calculated in ETB.
      </p>
    </Card>
  )
}

// ── Page with internal sidebar ───────────────────────────────────────────────

const SECTIONS = [
  {
    id: 'personal',
    label: 'Personal Info',
    icon: CircleUserRound,
    description: 'Your identity and work record',
    group: 'General',
  },
  {
    id: 'preferences',
    label: 'Preferences',
    icon: Palette,
    description: 'Theme and workspace behavior',
    group: 'General',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Choose what you get notified about',
    group: 'Account',
  },
  {
    id: 'security',
    label: 'Security',
    icon: KeyRound,
    description: 'Password and account safety',
    group: 'Account',
  },
  {
    id: 'language',
    label: 'Language & Region',
    icon: Globe,
    description: 'Date, time and currency formats',
    group: 'Account',
  },
]

const NAV_GROUPS = [
  {
    label: 'General',
    items: SECTIONS.filter((s) => s.group === 'General'),
  },
  {
    label: 'Account',
    items: SECTIONS.filter((s) => s.group === 'Account'),
  },
]

function EmployeeSettings() {
  const [section, setSection] = useState('personal')
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resumeUploading, setResumeUploading] = useState(false)
  const [docUploading, setDocUploading] = useState(false)
  const [statusUploading, setStatusUploading] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [user, setUser] = useState(() => getCurrentUser())
  const [employee, setEmployee] = useState(null)

  useEffect(() => {
    let cancelled = false

    // Fresh account data from the server
    fetchMe()
      .then((data) => {
        if (cancelled || !data?.user) return
        setUser(data.user)
        try {
          localStorage.setItem('user', JSON.stringify({ ...getCurrentUser(), ...data.user }))
        } catch {}
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))

    // Employee record (work info) — read-only
    Promise.all([
      fetchEmployees(),
      fetchMyEmployeeProfile().catch(() => ({})),
    ])
      .then(([data, profile]) => {
        if (cancelled) return
        const record = resolveEmployee(
          Array.isArray(data) ? data : [],
          getCurrentUser(),
        )
        setEmployee({ ...record, ...profile })
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const saveProfile = async (form) => {
    setSaving(true)
    try {
      // The account fields and the employee record are two different rows, so
      // this is two requests. Each is sent only with what actually changed,
      // which is what lets the server treat every field as opt-in - sending an
      // untouched group as blank would clear the one that was not being saved.
      let touched = false

      if (form.name !== (user?.name || '') || form.email !== (user?.email || '')) {
        const res = await updateProfileApi({ name: form.name, email: form.email })
        setUser(res.user)
        try {
          localStorage.setItem('user', JSON.stringify({ ...getCurrentUser(), ...res.user }))
        } catch {}
        touched = true
      }

      const identifierChanges = {}

      if (form.tin !== (employee?.tin || '')) identifierChanges.tin = form.tin
      if (form.pensionId !== (employee?.pensionId || '')) identifierChanges.pensionId = form.pensionId

      if (Object.keys(identifierChanges).length) {
        const employeeProfile = await updateMyEmployeeProfile(identifierChanges)
        setEmployee((current) => ({ ...current, ...employeeProfile }))
        touched = true
      }

      showToast(touched ? 'Personal info saved' : 'Nothing to save')
    } catch (err) {
      showToast(err.message || 'Could not save changes')
    } finally {
      setSaving(false)
    }
  }

  const saveProfessionalProfile = async (form) => {
    setSaving(true)
    try {
      const employeeProfile = await updateMyEmployeeProfile({
        githubUrl: form.githubUrl,
        linkedinUrl: form.linkedinUrl,
        portfolioUrl: form.portfolioUrl,
        skills: form.skills,
      })
      setEmployee((current) => ({ ...current, ...employeeProfile }))
      showToast('Professional profile saved')
    } catch (err) {
      showToast(err.message || 'Could not save changes')
    } finally {
      setSaving(false)
    }
  }

  const uploadProfilePhoto = async (file) => {
    if (!file.type.startsWith('image/')) return showToast('Choose an image file')
    if (file.size > 2 * 1024 * 1024) return showToast('Profile photo must be 2 MB or smaller')
    setPhotoUploading(true)
    try {
      const avatar = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('Could not read the selected image'))
        reader.readAsDataURL(file)
      })
      const profile = await updateMyEmployeeProfile({ avatar })
      setEmployee((current) => ({ ...current, ...profile }))
      showToast('Profile photo updated')
    } catch (err) {
      showToast(err.message || 'Could not update profile photo')
    } finally {
      setPhotoUploading(false)
    }
  }

  const uploadResume = async (file) => {
    setResumeUploading(true)
    try {
      const profile = await uploadMyResume(file)
      setEmployee((current) => ({ ...current, ...profile }))
      showToast('Resume uploaded')
    } catch (err) {
      showToast(err.message || 'Could not upload resume')
    } finally {
      setResumeUploading(false)
    }
  }

  const uploadDoc = async (file) => {
    setDocUploading(true)
    try {
      const profile = await uploadEmployeeDocument(file, 'Document', file.name)
      setEmployee((current) => ({ ...current, ...profile }))
      showToast('Document uploaded')
    } catch (err) {
      showToast(err.message || 'Could not upload document')
    } finally {
      setDocUploading(false)
    }
  }

  const downloadDoc = async (id, fileName) => {
    try {
      const blob = await downloadEmployeeDocument(id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName || 'document'
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      showToast(err.message || 'Could not download document')
    }
  }

  const deleteDoc = async (id) => {
    try {
      const profile = await deleteEmployeeDocument(id)
      setEmployee((current) => ({ ...current, ...profile }))
      showToast('Document deleted')
    } catch (err) {
      showToast(err.message || 'Could not delete document')
    }
  }

  const downloadResume = async () => {
    try {
      const blob = await downloadMyResume()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = employee?.resumeFileName || 'resume'
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      showToast(err.message || 'Could not download resume')
    }
  }

  const uploadStatusDocument = async (file) => {
    setStatusUploading(true)
    try {
      const profile = await uploadMyStatusDocument(file)
      setEmployee((current) => ({ ...current, ...profile }))
      showToast('Status document uploaded')
    } catch (err) {
      showToast(err.message || 'Could not upload the status document')
    } finally {
      setStatusUploading(false)
    }
  }

  const downloadStatusDocument = async () => {
    try {
      const blob = await downloadMyStatusDocument()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = employee?.statusFileName || 'status-document'
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      showToast(err.message || 'Could not download the status document')
    }
  }

  const active = SECTIONS.find((s) => s.id === section)

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto">
      <Toast toast={toast} />

      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gray-950 text-white dark:bg-[#3a4149] flex items-center justify-center shadow-xs">
          <CircleUserRound size={18} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-100">
            My Settings
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Your personal space — profile, preferences and account security
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Internal sidebar */}
        <aside className="w-full lg:w-56 shrink-0 lg:sticky lg:top-6">
          <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0" aria-label="Settings sections">
            {NAV_GROUPS.map((group) => {
              const groupActive = group.items.some((item) => item.id === section)
              return (
                <div
                  key={group.label}
                  className={`contents lg:block transition-colors p-1 ${
                    groupActive ? 'lg:bg-gray-100 dark:lg:bg-[#171a20]' : ''
                  }`}
                >
                  <p className="hidden lg:block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 pt-3 pb-1">
                    {group.label}
                  </p>
                  {group.items.map(({ id, label, icon: Icon, description }) => {
                    const isActive = section === id
                    return (
                      <button
                        key={id}
                        onClick={() => setSection(id)}
                        onMouseEnter={() => setSection(id)}
                        className={`group flex items-center gap-3 border-l-[3px] px-3 py-2 text-left whitespace-nowrap transition-colors min-w-[160px] lg:min-w-0 ${
                          isActive
                            ? 'border-gray-950 bg-white text-gray-950 shadow-2xs dark:border-white dark:bg-[#22262c] dark:text-white'
                            : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#1c2026] dark:hover:text-gray-100'
                        }`}
                        title={label}
                      >
                        <Icon size={16} className="shrink-0 text-gray-500 dark:text-gray-400" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] font-medium">{label}</span>
                          <span className="hidden lg:block text-[10px] text-gray-400 dark:text-gray-500 truncate">
                            {description}
                          </span>
                        </span>
                        <ChevronRight
                          size={13}
                          className={`hidden lg:block shrink-0 text-gray-300 dark:text-gray-600 transition-transform ${
                            isActive ? 'translate-x-0.5 text-gray-500 dark:text-gray-400' : ''
                          }`}
                        />
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </nav>
        </aside>

        {/* Active section content */}
        <div className="flex-1 min-w-0 w-full">
          <p className="hidden lg:flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 mb-3">
            <active.icon size={12} /> {active.description}
          </p>

          {section === 'personal' && (
            <PersonalInfoSection
              user={user}
              employee={employee}
              loading={loading}
              saving={saving}
              resumeUploading={resumeUploading}
              docUploading={docUploading}
              statusUploading={statusUploading}
              onUploadPhoto={uploadProfilePhoto}
              photoUploading={photoUploading}
              onSave={saveProfile}
              onSaveProfessionalProfile={saveProfessionalProfile}
              onUploadResume={uploadResume}
              onDownloadResume={downloadResume}
              onUploadDoc={uploadDoc}
              onDownloadDoc={downloadDoc}
              onDeleteDoc={deleteDoc}
              onUploadStatusDocument={uploadStatusDocument}
              onDownloadStatusDocument={downloadStatusDocument}
            />
          )}
          {section === 'preferences' && <PreferencesSection />}
          {section === 'notifications' && <NotificationsSection />}
          {section === 'security' && <SecuritySection showToast={showToast} />}
          {section === 'language' && <LanguageRegionSection />}
        </div>
      </div>
    </div>
  )
}

export default EmployeeSettings
