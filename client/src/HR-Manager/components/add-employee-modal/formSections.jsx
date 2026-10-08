import {
  User,
  Briefcase,
  DollarSign,
  CreditCard,
  UploadCloud,
  FileText,
  Trash2,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  IdCard,
  Plus,
  ShieldCheck,
  Cake,
} from 'lucide-react'
import { HR_SETTINGS } from '../../data/settingsData'
import { ETHIOPIAN_BANKS, formatFileSize } from './constants'
import LuxuryDatePicker from './LuxuryDatePicker'
import LuxuryPhoneInput from './LuxuryPhoneInput'

// Format a YYYY-MM-DD string into a readable age ("24 years old")
export function formatAge(dateStr) {
  if (!dateStr) return ''
  const dob = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(dob.getTime())) return ''
  const today = new Date()
  let years = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) years -= 1
  if (years < 0) return 'Invalid date (future)'
  return `${years} ${years === 1 ? 'year' : 'years'} old`
}

// Shared input class helper
const inputBase =
  'w-full px-3 py-2 text-xs rounded-lg border bg-white dark:bg-[#15181d] dark:text-gray-200 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1'
const inputNormal = `${inputBase} border-gray-300 dark:border-[#33383f] focus:ring-gray-900`
const inputMono = `${inputBase} font-mono`

export function PersonalSection({ formData, errors, isDuplicateId, hasIdentity, handleChange, handleFileChange, removeFile }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-1.5 border-b border-gray-100 dark:border-[#262b31]">
        <User size={15} className="text-gray-900 dark:text-gray-100" />
        <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">
          1. Identification &amp; Personal Info
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Full Name */}
        <div className="sm:col-span-2">
          <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
            Full Name <span className="text-rose-600">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Almaz Bekele Kebede"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`${inputBase} ${
              errors.name ? 'border-rose-400 focus:ring-rose-500' : 'border-gray-300 dark:border-[#33383f] focus:ring-gray-900'
            }`}
          />
          {errors.name && <p className="text-[11px] text-rose-600 mt-1">{errors.name}</p>}
        </div>

        {/* Gender */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-bold text-gray-800 dark:text-gray-200">Gender</label>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">Optional</span>
          </div>
          <select
            value={formData.gender}
            onChange={(e) => handleChange('gender', e.target.value)}
            className={inputNormal}
          >
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Other">Other / Unspecified</option>
          </select>
        </div>

        {/* Date of Birth */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-bold text-gray-800 dark:text-gray-200">Date of Birth</label>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">Optional</span>
          </div>
          <LuxuryDatePicker
            value={formData.dateOfBirth}
            onChange={(date) => handleChange('dateOfBirth', date)}
            maxDate={new Date().toISOString().slice(0, 10)}
            placeholder="Select date"
          />
          {formData.dateOfBirth && (
            <p className="mt-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Cake size={11} className="text-amber-500" />
              {formatAge(formData.dateOfBirth)}
            </p>
          )}
        </div>

        {/* Phone */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-bold text-gray-800 dark:text-gray-200">Phone</label>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">Optional</span>
          </div>
          <LuxuryPhoneInput
            value={formData.phone}
            onChange={(phone) => handleChange('phone', phone)}
            error={errors.phone}
          />
        </div>

        {/* Email - the employee's login address. It is filled in from the name
            while the form is being filled out, and stays editable afterwards.
            It does not have to be a real or external mailbox: a company
            address such as employee@yanoltech.com is the normal case. */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-bold text-gray-800 dark:text-gray-200">Email</label>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">From the name</span>
          </div>
          <input
            type="email"
            placeholder="employee@yanoltech.com"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className={`${inputBase} ${
              errors.email ? 'border-rose-400 focus:ring-rose-500' : 'border-gray-300 dark:border-[#33383f] focus:ring-gray-900'
            }`}
          />
          {errors.email && <p className="text-[11px] text-rose-600 mt-1">{errors.email}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Address */}
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label className="font-bold text-gray-800 dark:text-gray-200">Address</label>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">Optional</span>
          </div>
          <input
            type="text"
            placeholder="e.g. Bole Sub-City, Addis Ababa"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            className={inputNormal}
          />
        </div>

        {/* Emergency Contact */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-bold text-gray-800 dark:text-gray-200">Emergency Contact</label>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">Optional</span>
          </div>
          <LuxuryPhoneInput
            value={formData.emergencyContact}
            onChange={(phone) => handleChange('emergencyContact', phone)}
          />
        </div>
      </div>

      {/* 1b. Government ID Verification */}
      <div
        className={`rounded-xl border p-3.5 space-y-3 transition-colors ${
          hasIdentity
            ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/10'
            : 'border-gray-200 dark:border-[#262b31] bg-gray-50/50 dark:bg-[#1c2026]'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IdCard size={15} className="text-gray-900 dark:text-gray-100" />
            <h5 className="text-[11px] font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">
              Government ID Verification
            </h5>
            {hasIdentity && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60">
                <CheckCircle2 size={11} /> Verified
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            Optional — recommended for KYC / audit
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* ID Type */}
          <div>
            <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">ID Type</label>
            <select
              value={formData.identityIdType}
              onChange={(e) => handleChange('identityIdType', e.target.value)}
              className={`${inputNormal} font-medium`}
            >
              <option value="National ID (ET)">National ID (ET)</option>
              <option value="Kebele ID">Kebele ID</option>
              <option value="Passport">Passport</option>
              <option value="Driver License">Driver License</option>
              <option value="Student ID">Student ID</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* ID Document Upload */}
          <div>
            <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
              Attach ID scan / photo
            </label>
            {formData.identityDocument.length === 0 ? (
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-[#33383f] bg-white dark:bg-[#15181d] cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors w-full">
                <UploadCloud size={14} className="text-gray-400" />
                <span className="text-xs text-gray-600 dark:text-gray-300">Upload document</span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => handleFileChange('identityDocument', e)}
                />
              </label>
            ) : (
              <div className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-[#262b31] bg-white dark:bg-[#15181d]">
                <FileText size={15} className="text-emerald-600 shrink-0" />
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[140px]">
                  {formData.identityDocument[0].name}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile('identityDocument', 0)}
                  className="text-gray-400 hover:text-rose-600 p-1 transition-colors shrink-0"
                  title="Remove ID document"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function JobSection({
  formData,
  errors,
  shouldShowExitDate,
  handleChange,
  departments = HR_SETTINGS.departments,
  employmentTypes = HR_SETTINGS.employmentTypes,
  employmentStatuses = HR_SETTINGS.employmentStatuses,
}) {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-2 pb-1.5 border-b border-gray-100 dark:border-[#262b31]">
        <Briefcase size={15} className="text-gray-900 dark:text-gray-100" />
        <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">
          2. Job &amp; Employment Details
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Department */}
        <div>
          <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
            Department <span className="text-rose-600">*</span>
          </label>
          <select
            required
            value={formData.department}
            onChange={(e) => handleChange('department', e.target.value)}
            className={inputNormal}
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* Job Title */}
        <div>
          <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
            Job Title <span className="text-rose-600">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Senior Operations Officer"
            value={formData.jobTitle}
            onChange={(e) => handleChange('jobTitle', e.target.value)}
            className={`${inputBase} ${
              errors.jobTitle
                ? 'border-rose-400 focus:ring-rose-500'
                : 'border-gray-300 dark:border-[#33383f] focus:ring-gray-900'
            }`}
          />
          {errors.jobTitle && <p className="text-[11px] text-rose-600 mt-1">{errors.jobTitle}</p>}
        </div>

        {/* Employment Type */}
        <div>
          <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
            Employment Type <span className="text-rose-600">*</span>
          </label>
          <select
            value={formData.employmentType}
            onChange={(e) => handleChange('employmentType', e.target.value)}
            className={`${inputNormal} font-medium`}
          >
            {employmentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
            {formData.employmentType === 'Permanent'
              ? 'Permanent role (No Exit Date required)'
              : `${formData.employmentType} role requires an Exit / Contract End Date`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Employment Status */}
        <div>
          <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
            Employment Status <span className="text-rose-600">*</span>
          </label>
          <select
            value={formData.employmentStatus}
            onChange={(e) => handleChange('employmentStatus', e.target.value)}
            className={`${inputNormal} font-medium`}
          >
            {employmentStatuses.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Join Date */}
        <div>
          <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
            Join Date <span className="text-rose-600">*</span>
          </label>
          <LuxuryDatePicker
            value={formData.joinDate}
            onChange={(date) => handleChange('joinDate', date)}
            placeholder="Select date"
            maxDate={new Date().toISOString().slice(0, 10)}
          />
        </div>

        {/* Exit Date — Dynamically shown for Contractual, Intern, or Resigned/Terminated */}
        {shouldShowExitDate ? (
          <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 animate-in fade-in duration-150">
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-amber-950 flex items-center gap-1.5">
                <span>Exit Date</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-amber-200/80 text-amber-900 rounded">
                  {formData.employmentType !== 'Permanent'
                    ? `${formData.employmentType} End`
                    : formData.employmentStatus}
                </span>
              </label>
              <span className="text-[10px] text-amber-700 font-medium">Expected</span>
            </div>
            <input
              type="date"
              value={formData.exitDate}
              onChange={(e) => handleChange('exitDate', e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-amber-300 dark:border-amber-400/40 bg-white dark:bg-[#15181d] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
            />
            <p className="text-[10px] text-amber-800 mt-1">
              {formData.employmentType !== 'Permanent'
                ? `Contract duration endpoint for ${formData.employmentType}`
                : `Statutory exit date for ${formData.employmentStatus} record`}
            </p>
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#1c2026] border border-dashed border-gray-200 dark:border-[#262b31] flex flex-col justify-center text-gray-400 dark:text-gray-500">
            <span className="font-semibold text-[11px] text-gray-500 dark:text-gray-400">Exit Date: N/A</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              Not applicable for Permanent staff (enabled on Contractual, Intern, or Resigned/Terminated)
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

const ALLOWANCE_FIELDS = [
  { key: 'transportAllowance', label: 'Transport Allow.' },
  { key: 'housingAllowance', label: 'Housing Allow.' },
  { key: 'mealAllowance', label: 'Meal Allow.' },
  { key: 'otherAllowance', label: 'Other Allow.' },
]

export function CompensationSection({ formData, errors, grossMonthly, basicSalaryNum, handleChange }) {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 dark:border-[#262b31]">
        <div className="flex items-center gap-2">
          <DollarSign size={15} className="text-gray-900 dark:text-gray-100" />
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">
            3. Compensation &amp; Allowances (ETB)
          </h4>
        </div>
        <span className="text-[11px] font-mono font-bold text-gray-600 dark:text-gray-400">
          Total Monthly Gross: ETB {grossMonthly.toLocaleString()}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {/* Basic Salary */}
        <div className="sm:col-span-1">
          <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
            Basic Salary <span className="text-rose-600">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="100"
              required
              placeholder="e.g. 30000"
              value={formData.basicSalary}
              onChange={(e) => handleChange('basicSalary', e.target.value)}
              className={`${inputMono} font-semibold ${
                errors.basicSalary
                  ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30'
                  : 'border-gray-300 dark:border-[#33383f] focus:ring-gray-900'
              }`}
            />
          </div>
          {errors.basicSalary && <p className="text-[11px] text-rose-600 mt-1">{errors.basicSalary}</p>}
          <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 block sr-only">
            {basicSalaryNum}
          </span>
        </div>

        {/* Allowances */}
        {ALLOWANCE_FIELDS.map((field) => (
          <div key={field.key}>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-gray-800 dark:text-gray-200 truncate">{field.label}</label>
            </div>
            <input
              type="number"
              min="0"
              step="50"
              placeholder="0"
              value={formData[field.key]}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className={`${inputMono}`}
            />
            <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 block">Optional</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function BankingSection({ formData, isDuplicateTin, hasTin, hasBankAccount, handleChange }) {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 dark:border-[#262b31]">
        <div className="flex items-center gap-2">
          <CreditCard size={15} className="text-gray-900 dark:text-gray-100" />
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">
            4. Banking &amp; Statutory Identification
          </h4>
        </div>
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          Can be entered now or updated later
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Bank Name */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-bold text-gray-800 dark:text-gray-200">Bank Name</label>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">Optional</span>
          </div>
          <select
            value={formData.bankName}
            onChange={(e) => handleChange('bankName', e.target.value)}
            className={inputNormal}
          >
            {ETHIOPIAN_BANKS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Bank Account Number */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-bold text-gray-800 dark:text-gray-200">Bank Account No.</label>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">Optional</span>
          </div>
          <input
            type="text"
            placeholder="1000123456781"
            value={formData.bankAccount}
            onChange={(e) => handleChange('bankAccount', e.target.value)}
            className={`${inputNormal} font-mono`}
          />
          {!hasBankAccount && (
            <span className="text-[10px] text-amber-600 mt-1 block">
              Will show &quot;Missing Bank&quot; audit check
            </span>
          )}
        </div>

        {/* Tax Identification Number (TIN) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-bold text-gray-800 dark:text-gray-200">TIN</label>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">Optional</span>
          </div>
          <input
            type="text"
            placeholder="TIN-40019290"
            value={formData.tin}
            onChange={(e) => handleChange('tin', e.target.value)}
            className={`${inputMono} ${
              isDuplicateTin ? 'border-rose-400 bg-rose-50/40' : 'border-gray-300 dark:border-[#33383f] focus:ring-gray-900'
            }`}
          />
          {isDuplicateTin ? (
            <span className="text-[10px] text-rose-600 mt-1 block">Duplicate TIN detected</span>
          ) : !hasTin ? (
            <span className="text-[10px] text-amber-600 mt-1 block">
              Will show &quot;Missing TIN&quot; audit check
            </span>
          ) : null}
        </div>

        {/* Pension ID */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-bold text-gray-800 dark:text-gray-200">Pension ID</label>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">Optional</span>
          </div>
          <input
            type="text"
            placeholder="PEN-00109"
            value={formData.pensionId}
            onChange={(e) => handleChange('pensionId', e.target.value)}
            className={`${inputNormal} font-mono`}
          />
        </div>
      </div>
    </div>
  )
}

export function DocumentsSection({
  formData,
  handleFileChange,
  removeFile,
  addCertificateEntry,
  updateCertificateEntry,
  removeCertificate,
}) {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 dark:border-[#262b31]">
        <div className="flex items-center gap-2">
          <UploadCloud size={15} className="text-gray-900 dark:text-gray-100" />
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">
            5. Certificates &amp; CV Documents
          </h4>
        </div>
        <span className="text-[10px] text-gray-400 dark:text-gray-500">Optional</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* CV Upload */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">
            Curriculum Vitae (CV)
          </label>
          {formData.cv.length === 0 ? (
            <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-[#33383f] rounded-xl cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 bg-gray-50/50 dark:bg-[#1c2026] transition-colors">
              <UploadCloud size={20} className="text-gray-400 mb-1" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Upload CV (PDF, DOC)</span>
              <span className="text-[10px] text-gray-400">Max file size 10MB</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => handleFileChange('cv', e)}
              />
            </label>
          ) : (
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 dark:border-[#262b31] bg-gray-50 dark:bg-[#1c2026]">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText size={16} className="text-blue-600 shrink-0" />
                <div className="truncate">
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                    {formData.cv[0].name}
                  </p>
                  <p className="text-[10px] text-gray-400">{formatFileSize(formData.cv[0].size)}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeFile('cv', 0)}
                className="text-gray-400 hover:text-rose-600 p-1 transition-colors"
                title="Remove CV"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Certificates Upload */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">
              Certificates &amp; Credentials
            </label>
            <span className="text-[10px] text-gray-400">{formData.certificates.length} added</span>
          </div>
          <div className="space-y-2">
            <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-gray-300 dark:border-[#33383f] rounded-xl cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 bg-gray-50/50 dark:bg-[#1c2026] transition-colors">
              <UploadCloud size={20} className="text-gray-400 mb-1" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Quick-add files</span>
              <span className="text-[10px] text-gray-400">PDF, Images, etc. (multiple)</span>
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                className="hidden"
                onChange={(e) => handleFileChange('certificates', e)}
              />
            </label>
            <button
              type="button"
              onClick={addCertificateEntry}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-gray-300 dark:border-[#33383f] text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1c2026] transition-colors cursor-pointer"
            >
              <Plus size={14} className="text-gray-500" />
              Add Certificate (with details)
            </button>
          </div>
        </div>
      </div>

      {/* Certificates List */}
      {formData.certificates.length > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400">
            Uploaded Certificates ({formData.certificates.length})
          </span>
          <div className="space-y-2">
            {formData.certificates.map((cert, idx) => (
              <div
                key={cert.id}
                className="rounded-lg border border-gray-200 dark:border-[#262b31] bg-gray-50 dark:bg-[#1c2026] p-3 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                    <FileText size={13} className="text-emerald-600" />
                    Certificate #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCertificate(cert.id)}
                    className="text-gray-400 hover:text-rose-600 p-1 transition-colors"
                    title="Remove Certificate"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    placeholder="Title (e.g. BSc Computer Science)"
                    value={cert.title}
                    onChange={(e) => updateCertificateEntry(cert.id, 'title', e.target.value)}
                    className={`${inputNormal} py-1.5`}
                  />
                  <input
                    type="text"
                    placeholder="Issued by (Institution)"
                    value={cert.issuer}
                    onChange={(e) => updateCertificateEntry(cert.id, 'issuer', e.target.value)}
                    className={`${inputNormal} py-1.5`}
                  />
                  <input
                    type="date"
                    value={cert.issueDate}
                    onChange={(e) => updateCertificateEntry(cert.id, 'issueDate', e.target.value)}
                    className={`${inputNormal} py-1.5`}
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {cert.file ? (
                    <>
                      <div className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-[#262b31] bg-white dark:bg-[#15181d]">
                        <FileText size={14} className="text-emerald-600 shrink-0" />
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[160px]">
                          {cert.file.name}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {formatFileSize(cert.file.size)}
                        </span>
                      </div>
                      <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-[#33383f] bg-white dark:bg-[#15181d] text-[11px] font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                        <UploadCloud size={12} className="text-gray-400" />
                        Replace
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          className="hidden"
                          onChange={(e) =>
                            updateCertificateEntry(cert.id, 'file', e.target.files?.[0] || null)
                          }
                        />
                      </label>
                    </>
                  ) : (
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-[#33383f] bg-white dark:bg-[#15181d] text-[11px] font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                      <UploadCloud size={12} className="text-gray-400" />
                      Attach file
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        className="hidden"
                        onChange={(e) =>
                          updateCertificateEntry(cert.id, 'file', e.target.files?.[0] || null)
                        }
                      />
                    </label>
                  )}
                  {(cert.title || cert.file) && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <CheckCircle2 size={11} className="text-emerald-600" />
                      Will be saved
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={addCertificateEntry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1c2026] transition-colors cursor-pointer"
            >
              <Plus size={13} className="text-gray-500" />
              Add more certificate
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AuditCell({ label, ok, neutral = false, neutralText = '', okText, badText, tone = 'warn' }) {
  const colorClass = neutral
    ? 'text-gray-600 dark:text-gray-400'
    : ok
      ? 'text-emerald-700'
      : tone === 'error'
        ? 'text-rose-600'
        : 'text-amber-700'

  return (
    <div className="bg-white dark:bg-[#15181d] p-2.5 rounded-lg border border-gray-200 dark:border-[#262b31]">
      <span className="text-gray-500 dark:text-gray-400 block">{label}</span>
      <span className={`font-bold inline-flex items-center gap-1 mt-0.5 ${colorClass}`}>
        {neutral ? (
          <CheckCircle2 size={12} className="text-gray-400 dark:text-gray-500" />
        ) : ok ? (
          <CheckCircle2 size={12} />
        ) : tone === 'error' ? (
          <AlertCircle size={12} />
        ) : (
          <AlertTriangle size={12} />
        )}
        {neutral ? neutralText : ok ? okText : badText}
      </span>
    </div>
  )
}
