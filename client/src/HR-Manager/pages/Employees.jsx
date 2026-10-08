import { useEffect, useMemo, useState } from 'react'
import {
  BriefcaseBusiness,
  ArrowRight,
  Eye,
  LayoutGrid,
  MoreHorizontal,
  Pencil,
  Table2,
  Building2,
  ChevronDown,
  Copy,
  Check,
  Mail,
  Phone,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
  KeyRound,
  ExternalLink,
  Link2,
  FileText,
  Download,
  Archive,
  RotateCcw,
} from 'lucide-react'

import { PageTitle, Table, TableRowMenu } from '../../components/ui'
import { useSearchParams } from 'react-router-dom'
import { authHeaders, describeAuthFailure, downloadEmployeeResume } from '../../lib/hrApi'
import { withEmailFromName } from '../../lib/employeeEmail'
import { useAccess } from '../../lib/rbac'
import TableDataTools from '../components/TableDataTools'

const API_URL = 'http://localhost:4000/api/hr-manager'

const fallback_EMPLOYMENT_TYPES = ['Permanent', 'Contractual', 'Intern']

const fallback_STATUSES = ['Active', 'On Leave', 'Resigned', 'Terminated', 'Archived']

const fallback_GENDERS = ['Male', 'Female']

const fallback_DEPARTMENTS = ['Administration', 'Finance', 'Human Resources', 'IT', 'Logistics', 'Operations', 'Procurement', 'Sales & Marketing']

const ETHIOPIAN_BANKS = [
  'Commercial Bank of Ethiopia (CBE)',
  'Awash Bank',
  'Bank of Abyssinia',
  'Dashen Bank',
  'Hibret Bank',
  'Wegagen Bank',
  'Nib International Bank',
  'Zemen Bank',
  'Oromia Bank',
  'Amhara Bank',
  'Bunna Bank',
  'Cooperative Bank of Oromia',
  'Enat Bank',
  'Lion International Bank',
  'Telebirr',
]

const emptyForm = {
  employeeId: '',
  firstName: '',
  grandfatherName: '',
  lastName: '',
  gender: 'Male',
  dateOfBirth: '',
  email: '',
  phone: '',
  address: '',
  emergencyContact: '',
  department: '',
  position: '',
  employmentType: 'Permanent',
  status: 'Active',
  hireDate: '',
  notes: '',
  basicSalary: '',
  transportAllowance: '',
  housingAllowance: '',
  mealAllowance: '',
  otherAllowance: '',
  bankName: '',
  bankAccount: '',
  tin: '',
  pensionId: '',
}

function AnimatedStatNumber({ value }) {
  const numericValue = Number(value || 0)
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let animationFrameId
    const startTime = performance.now()
    const duration = 700

    const animate = (currentTime) => {
      const progress = Math.min(
        (currentTime - startTime) / duration,
        1,
      )

      const easedProgress = 1 - Math.pow(1 - progress, 3)

      setDisplayValue(
        Math.round(numericValue * easedProgress),
      )

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(animate)
      }
    }

    animationFrameId = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [numericValue])

  return displayValue
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getEmployeeName(employee) {
  if (employee?.name) {
    return employee.name
  }

  return (
    [
      employee?.firstName,
      employee?.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Unnamed Employee'
  )
}

function getEmployeeId(employee) {
  return employee?.employeeId || employee?.id || '—'
}

function getInitials(employee) {
  if (employee?.initials) {
    return employee.initials
  }

  const name = getEmployeeName(employee)

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function normalizeEmployee(employee) {
  const name = getEmployeeName(employee)
  const nameParts = name.split(' ').filter(Boolean)

  return {
    ...employee,

    id: employee.id || employee.employeeId,

    employeeId:
      employee.employeeId ||
      employee.id ||
      '',

    name,

    firstName:
      employee.firstName ||
      nameParts[0] ||
      '',

    lastName:
      employee.lastName ||
      nameParts.slice(1).join(' ') ||
      '',

    gender:
      employee.gender ||
      'Male',

    dateOfBirth:
      employee.dateOfBirth ||
      employee.dob ||
      '',

    joinDate:
      employee.joinDate ||
      employee.hireDate ||
      '',

    hireDate:
      employee.hireDate ||
      employee.joinDate ||
      '',

    jobTitle:
      employee.jobTitle ||
      employee.position ||
      '',

    position:
      employee.position ||
      employee.jobTitle ||
      '',

    department:
      employee.department ||
      'HR',

    employmentType:
      employee.employmentType ||
      'Permanent',

    employmentStatus:
      employee.employmentStatus ||
      employee.status ||
      'Active',

    status:
      employee.status ||
      employee.employmentStatus ||
      'Active',

    basicSalary: Number(
      employee.basicSalary || 0,
    ),

    transportAllowance: Number(
      employee.transportAllowance || 0,
    ),

    housingAllowance: Number(
      employee.housingAllowance || 0,
    ),

    mealAllowance: Number(
      employee.mealAllowance || 0,
    ),

    otherAllowance: Number(
      employee.otherAllowance || 0,
    ),

    bankName:
      employee.bankName || '',

    bankAccount:
      employee.bankAccount || '',

    tin:
      employee.tin || '',

    pensionId:
      employee.pensionId || '',

    phone:
      employee.phone || '',

    email:
      employee.email || '',

    address:
      employee.address || '',

    emergencyContact:
      employee.emergencyContact || '',

    notes:
      employee.notes || '',

    avatar:
      employee.avatar || '',

    location:
      employee.location || '',

    manager:
      employee.manager || '',

    roleType:
      employee.roleType || '',
  }
}

function statusClasses(status) {
  switch (status) {
    case 'Active':
      return 'bg-emerald-50 text-emerald-700'

    case 'On Leave':
      return 'bg-amber-50 text-amber-700'

    case 'Resigned':
      return 'bg-slate-100 text-slate-600'

    case 'Terminated':
      return 'bg-rose-50 text-rose-700'

    case 'Archived':
      return 'bg-purple-100 text-purple-700 ring-1 ring-purple-200'

    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function Field({
  label,
  children,
  required = false,
  hint = '',
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      {children}

      {hint && (
        <span className="mt-1 block text-[10px] leading-4 text-slate-400">
          {hint}
        </span>
      )}
    </label>
  )
}

function inputClassName() {
  return [
    'w-full rounded-xl border border-slate-200',
    'bg-white px-3.5 py-2.5 text-sm text-slate-900',
    'outline-none transition',
    'placeholder:text-slate-400',
    'focus:border-[#4755AE]',
    'focus:ring-2 focus:ring-[#4755AE]/10',
  ].join(' ')
}

function PhoneFieldInput({ name = 'phone', value, onChange, className }) {
  const normalized = String(value || '').replace(/[\s()-]/g, '')
  const complete = /^(0[79]\d{8}|\+251[79]\d{8})$/.test(normalized)
  const wrong = normalized.length >= 10 && !complete
  const national = normalized.replace(/^\+251/, '0')
  const detectedNetwork = /^07/.test(national) ? 'Safaricom' : /^09/.test(national) ? 'Ethio Telecom' : ''

  return (
    <div>
      <input className={`${className || inputClassName()} ${wrong ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-100' : ''}`} name={name} value={value} onChange={onChange} placeholder="07XXXXXXXX or 09XXXXXXXX" inputMode="tel" aria-invalid={wrong} />
      {detectedNetwork && !wrong && <p className="mt-1 text-[11px] font-medium text-slate-500">Detected network: <span className="font-bold text-[#4755AE]">{detectedNetwork}</span></p>}
      {wrong && <p className="mt-1 text-xs font-medium text-rose-600">Wrong phone number. Enter a valid 07... or 09... mobile number.</p>}
    </div>
  )
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Icon size={17} />
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-900">
          {title}
        </h3>

        <p className="mt-0.5 text-xs text-slate-400">
          {description}
        </p>
      </div>
    </div>
  )
}

/* =========================================================
   EXISTING EDIT EMPLOYEE MODAL
   Exit Date has been removed only.
========================================================= */

function EmployeeModal({
  employee,
  departments,
  onClose,
  onSave,
  saving,
}) {
  const editing = Boolean(employee)

  const [form, setForm] = useState(() => {
    return {
      ...emptyForm,
      ...employee,

      employeeId:
        employee.employeeId ||
        employee.id ||
        '',

      firstName:
        employee.firstName || '',

      lastName:
        employee.lastName || '',

      gender:
        employee.gender || 'Male',

      dateOfBirth:
        employee.dateOfBirth ||
        employee.dob ||
        '',

      email:
        employee.email || '',

      phone:
        employee.phone || '',

      address:
        employee.address || '',

      emergencyContact:
        employee.emergencyContact || '',

      department:
        employee.department ||
        departments[0] ||
        'HR',

      position:
        employee.position ||
        employee.jobTitle ||
        '',

      employmentType:
        employee.employmentType ||
        'Permanent',

      status:
        employee.status ||
        employee.employmentStatus ||
        'Active',

      hireDate:
        employee.hireDate ||
        employee.joinDate ||
        '',

      notes:
        employee.notes || '',

      basicSalary:
        employee.basicSalary ?? '',

      transportAllowance:
        employee.transportAllowance ?? '',

      housingAllowance:
        employee.housingAllowance ?? '',

      mealAllowance:
        employee.mealAllowance ?? '',

      otherAllowance:
        employee.otherAllowance ?? '',

      bankName:
        employee.bankName || '',

      bankAccount:
        employee.bankAccount || '',

      tin:
        employee.tin || '',

      pensionId:
        employee.pensionId || '',
    }
  })

  const [error, setError] = useState('')

  function handleChange(event) {
    const {
      name,
      value: rawValue,
    } = event.target

    const value =
      name === 'firstName' ||
        name === 'lastName' ||
        name === 'grandfatherName'
        ? rawValue.replace(/[^\p{L}\s]/gu, '')
        : rawValue

    if (
      name === 'dateOfBirth' &&
      value &&
      value.split('-')[0].length > 4
    ) {
      return
    }

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!form.employeeId.trim()) {
      setError('Employee ID is required.')
      return
    }

    if (
      !form.firstName.trim() ||
      !form.lastName.trim()
    ) {
      setError(
        'First name and last name are required.',
      )
      return
    }

    if (!form.dateOfBirth) {
      setError('Date of birth is required.')
      return
    }

    if (!form.email.trim()) {
      setError('Email address is required.')
      return
    }

    // Only presence is checked. The address becomes the employee's login, but
    // it does not have to be a real or external mailbox - a company address
    // such as employee@yanoltech.com is the normal case. The server applies the
    // same rule, so the form and the API never disagree.

    if (!form.department) {
      setError('Department is required.')
      return
    }

    if (!form.position.trim()) {
      setError('Job title is required.')
      return
    }

    if (!form.hireDate) {
      setError('Join date is required.')
      return
    }

    const firstName =
      form.firstName.trim()

    const lastName =
      form.lastName.trim()

    const employeeData = {
      ...(employee || {}),
      ...form,

      employeeId:
        form.employeeId
          .trim()
          .padStart(4, '0'),

      firstName,
      lastName,

      name:
        `${firstName} ${lastName}`,

      gender:
        form.gender || 'Male',

      dateOfBirth:
        form.dateOfBirth,

      position:
        form.position.trim(),

      jobTitle:
        form.position.trim(),

      department:
        form.department,

      employmentType:
        form.employmentType,

      status:
        form.status,

      employmentStatus:
        form.status,

      hireDate:
        form.hireDate,

      joinDate:
        form.hireDate,

      basicSalary:
        Number(form.basicSalary || 0),

      transportAllowance:
        Number(
          form.transportAllowance || 0,
        ),

      housingAllowance:
        Number(
          form.housingAllowance || 0,
        ),

      mealAllowance:
        Number(
          form.mealAllowance || 0,
        ),

      otherAllowance:
        Number(
          form.otherAllowance || 0,
        ),

      bankName:
        form.bankName.trim(),

      bankAccount:
        form.bankAccount.trim(),

      tin:
        form.tin.trim(),

      pensionId:
        form.pensionId.trim(),

      phone:
        form.phone.trim(),

      email:
        form.email.trim(),

      address:
        form.address.trim(),

      emergencyContact:
        form.emergencyContact.trim(),

      notes:
        form.notes.trim(),
    }

    onSave(employeeData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
              Employee Management
            </p>

            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
              Edit Employee
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto px-6 py-6"
        >
          <div className="space-y-8">

            {/* Identification */}
            <section>
              <SectionTitle
                icon={Users}
                title="Employee Identification"
              />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                <Field
                  label="Employee ID"
                  required
                >
                  <input
                    className={inputClassName()}
                    name="employeeId"
                    value={form.employeeId}
                    onChange={handleChange}
                    placeholder="e.g. EMP-001"
                    disabled
                  />

                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Employee ID cannot be changed after creation.
                  </p>
                </Field>

                <Field
                  label="First Name"
                  required
                >
                  <input
                    className={inputClassName()}
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="e.g. Abebe"
                  />
                </Field>

                <Field
                  label="Last Name"
                  required
                >
                  <input
                    className={inputClassName()}
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="e.g. Kebede"
                  />
                </Field>

                <Field label="Gender">
                  <select
                    className={inputClassName()}
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                  >
                    {(dynamicSettings?.genders || fallback_GENDERS).map(
                      (gender) => (
                        <option
                          key={gender}
                          value={gender}
                        >
                          {gender}
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                <Field
                  label="Date of Birth"
                  required
                >
                  <input
                    type="date"
                    className={inputClassName()}
                    name="dateOfBirth"
                    value={form.dateOfBirth}
                    onChange={handleChange}
                  />
                </Field>

                <Field
                  label="Email"
                  required
                >
                  <input
                    type="email"
                    className={inputClassName()}
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="employee@yanoltech.com"
                  />
                </Field>

                <Field label="Phone">
                  <PhoneFieldInput value={form.phone} onChange={handleChange} />
                </Field>

                <Field label="Address">
                  <input
                    className={inputClassName()}
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Employee address"
                  />
                </Field>

                <Field label="Emergency Contact">
                  <input
                    className={inputClassName()}
                    name="emergencyContact"
                    value={form.emergencyContact}
                    onChange={handleChange}
                    placeholder="Name / phone"
                  />
                </Field>

              </div>
            </section>

            {/* Employment */}
            <section>
              <SectionTitle
                icon={BriefcaseBusiness}
                title="Employment Information"
              />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                <Field
                  label="Department"
                  required
                >
                  <select
                    className={inputClassName()}
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                  >
                    {departments.map(
                      (department) => (
                        <option
                          key={department}
                          value={department}
                        >
                          {department}
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                <Field
                  label="Job Title"
                  required
                >
                  <input
                    className={inputClassName()}
                    name="position"
                    value={form.position}
                    onChange={handleChange}
                    placeholder="e.g. HR Officer"
                  />
                </Field>

                <Field label="Employment Type">
                  <select
                    className={inputClassName()}
                    name="employmentType"
                    value={form.employmentType}
                    onChange={handleChange}
                  >
                    {(dynamicSettings?.employmentTypes || fallback_EMPLOYMENT_TYPES).map(
                      (type) => (
                        <option
                          key={type}
                          value={type}
                        >
                          {type}
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                <Field label="Employment Status">
                  <select
                    className={inputClassName()}
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    {(dynamicSettings?.employmentStatuses || fallback_STATUSES).map(
                      (status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status}
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                <Field
                  label="Join Date"
                  required
                >
                  <input
                    type="date"
                    className={inputClassName()}
                    name="hireDate"
                    value={form.hireDate}
                    onChange={handleChange}
                  />
                </Field>

                <Field label="Notes">
                  <textarea
                    className={`${inputClassName()} min-h-[92px] resize-none`}
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Additional employee notes"
                  />
                </Field>

              </div>
            </section>

            {/* Compensation */}
            <section>
              <SectionTitle
                icon={Building2}
                title="Compensation"
              />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                <Field label="Basic Salary">
                  <input
                    type="number"
                    min="0"
                    className={inputClassName()}
                    name="basicSalary"
                    value={form.basicSalary}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </Field>

                <Field label="Transport Allowance">
                  <input
                    type="number"
                    min="0"
                    className={inputClassName()}
                    name="transportAllowance"
                    value={form.transportAllowance}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </Field>

                <Field label="Housing Allowance">
                  <input
                    type="number"
                    min="0"
                    className={inputClassName()}
                    name="housingAllowance"
                    value={form.housingAllowance}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </Field>

                <Field label="Meal Allowance">
                  <input
                    type="number"
                    min="0"
                    className={inputClassName()}
                    name="mealAllowance"
                    value={form.mealAllowance}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </Field>

                <Field label="Other Allowance">
                  <input
                    type="number"
                    min="0"
                    className={inputClassName()}
                    name="otherAllowance"
                    value={form.otherAllowance}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </Field>

              </div>
            </section>

            {/* Payroll */}
            <section>
              <SectionTitle
                icon={Building2}
                title="Payroll Information"
              />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                <Field label="Bank Name">
                  <input
                    className={inputClassName()}
                    name="bankName"
                    value={form.bankName}
                    onChange={handleChange}
                    placeholder="Bank name"
                  />
                </Field>

                <Field label="Bank Account">
                  <input
                    className={inputClassName()}
                    name="bankAccount"
                    value={form.bankAccount}
                    onChange={handleChange}
                    placeholder="Account number"
                  />
                </Field>

                <Field label="TIN">
                  <input
                    className={inputClassName()}
                    name="tin"
                    value={form.tin}
                    onChange={handleChange}
                    placeholder="Tax Identification Number"
                  />
                </Field>

                <Field label="Pension / SSN ID">
                  <input
                    className={inputClassName()}
                    name="pensionId"
                    value={form.pensionId}
                    onChange={handleChange}
                    placeholder="Pension ID"
                  />
                </Field>

              </div>
            </section>

          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#4755AE] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d4998] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? 'Saving...'
                : 'Save Changes'}
            </button>

          </div>
        </form>
      </div>
    </div>
  )
}

/* =========================================================
   NEW ADD EMPLOYEE DRAWER
   Existing employee fields are preserved.
========================================================= */

function AddEmployeeDrawer({
  dynamicSettings,
  departments,
  employees,
  onClose,
  onSave,
  saving,
}) {
  const [step, setStep] = useState(1)
  const [settingLists, setSettingLists] = useState({
    departments: departments || [],
    jobTitles: [],
    employmentTypes: (dynamicSettings?.employmentTypes || fallback_EMPLOYMENT_TYPES),
    employmentStatuses: (dynamicSettings?.employmentStatuses || fallback_STATUSES),
  })
  const [addingSetting, setAddingSetting] = useState('')
  const [newSettingValue, setNewSettingValue] = useState('')
  const [bankNames, setBankNames] = useState(ETHIOPIAN_BANKS)
  const [addingBank, setAddingBank] = useState(false)
  const [newBankName, setNewBankName] = useState('')

  useEffect(() => {
    let active = true
    fetch(`${API_URL}/settings`, {
      headers: authHeaders(),
    })
      .then((response) => response.json())
      .then((data) => {
        if (!active) return
        setSettingLists({
          departments: data.departments || departments || [],
          jobTitles: data.jobTitles || [],
          employmentTypes: data.employmentTypes || (dynamicSettings?.employmentTypes || fallback_EMPLOYMENT_TYPES),
          employmentStatuses: data.employmentStatuses || (dynamicSettings?.employmentStatuses || fallback_STATUSES),
        })
        setForm((current) => ({
          ...current,
          department: data.departments?.includes(current.department) ? current.department : (data.departments?.[0] || ''),
          employmentType: data.employmentTypes?.includes(current.employmentType) ? current.employmentType : (data.employmentTypes?.[0] || ''),
          status: 'Active',
        }))
      })
      .catch(() => { })
    return () => { active = false }
  }, [departments])

  async function addSettingOption(key) {
    const value = newSettingValue.trim()
    if (!value) return
    const currentList = settingLists[key] || []
    if (currentList.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setNewSettingValue('')
      setAddingSetting('')
      return
    }
    try {
      const currentResponse = await fetch(`${API_URL}/settings`, {
        headers: authHeaders(),
      })
      const currentSettings = await currentResponse.json()
      const updatedList = [...(currentSettings[key] || currentList), value]
      const saveResponse = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ...currentSettings, [key]: updatedList }),
      })
      const savedSettings = await saveResponse.json()
      if (!saveResponse.ok) throw new Error(savedSettings.message || 'Could not save option.')
      setSettingLists((current) => ({ ...current, [key]: savedSettings[key] || updatedList }))
      const field = { departments: 'department', jobTitles: 'position', employmentTypes: 'employmentType', employmentStatuses: 'status' }[key]
      if (field) setForm((current) => ({ ...current, [field]: value }))
      setNewSettingValue('')
      setAddingSetting('')
      setError('')
    } catch (saveError) {
      setError(saveError.message || 'Could not save option.')
    }
  }

  const nextEmployeeId = useMemo(() => {
    // Always use the first available 4-digit Employee ID.
    // This means an ID released by deleting an employee becomes
    // available again before moving on to a higher ID.
    const usedIds = new Set(
      (employees || [])
        .map((employee) =>
          String(employee?.employeeId || '').trim()
        )
        .map((id) => {
          const match = id.match(/^\d+$/)
          return match ? Number(match[0]) : null
        })
        .filter(
          (id) =>
            Number.isInteger(id) &&
            id > 0 &&
            id <= 9999,
        ),
    )

    let nextId = 1

    while (usedIds.has(nextId) && nextId <= 9999) {
      nextId += 1
    }

    return String(nextId).padStart(4, '0')
  }, [employees])

  const [form, setForm] = useState({
    ...emptyForm,
    employeeId: nextEmployeeId,
    department:
      departments[0] || 'HR',
  })

  const [error, setError] = useState('')

  const availableDepartments = settingLists.departments

  function handleChange(event) {
    const {
      name,
      value: rawValue,
    } = event.target

    const value =
      name === 'firstName' ||
        name === 'lastName' ||
        name === 'grandfatherName'
        ? rawValue.replace(/[^\p{L}\s]/gu, '')
        : rawValue

    if (
      (name === 'dateOfBirth' || name === 'hireDate') &&
      value &&
      value.split('-')[0].length > 4
    ) {
      return
    }

    setForm((current) => {
      if (name === 'employeeId') {
        const digitsOnly = value
          .replace(/\D/g, '')
          .slice(0, 4)

        return {
          ...current,
          employeeId: digitsOnly,
        }
      }

      // The email field follows the name. Filling it in saves the HR Admin
      // transcribing an address, and the field stays editable: once they type
      // their own address it no longer looks generated, so the name stops
      // overwriting it. What they end up with is what gets saved - the server
      // takes the address as given.
      if (name === 'firstName' || name === 'lastName') {
        const updated = {
          ...current,
          [name]: value,
        }

        // Read the names back out of `updated`, not `current`: whichever field
        // is being typed is already replaced above, and reading `current` would
        // build the address from the previous keystroke.
        return withEmailFromName(
          updated,
          `${updated.firstName} ${updated.lastName}`,
        )
      }

      return {
        ...current,
        [name]: value,
      }
    })

    if (error) {
      setError('')
    }
  }

  function validateStep(currentStep) {
    setError('')

    if (currentStep === 1) {
      if (!form.employeeId.trim()) {
        setError('Employee ID is required.')
        return false
      }

      if (!form.firstName.trim()) {
        setError('First name is required.')
        return false
      }

      const namePattern = /^[\p{L}\s]+$/u
      if (!namePattern.test(form.firstName.trim())) {
        setError('First name must contain letters only.')
        return false
      }

      if (!form.lastName.trim()) {
        setError('Last name is required.')
        return false
      }

      if (!namePattern.test(form.lastName.trim())) {
        setError('Last name must contain letters only.')
        return false
      }

      if (
        form.grandfatherName.trim() &&
        !namePattern.test(form.grandfatherName.trim())
      ) {
        setError('Grandfather name must contain letters only.')
        return false
      }

      if (!form.dateOfBirth) {
        setError('Date of birth is required.')
        return false
      }

      if (!form.email.trim()) {
        setError('Email address is required.')
        return false
      }

      // Presence only, matching the server. A company address is a normal login
      // and does not have to resolve to a real external mailbox.

      if (form.phone.trim()) {
        const normalizedPhone = form.phone.replace(/[\s()-]/g, '')
        if (!/^(0[79]\d{8}|\+251[79]\d{8})$/.test(normalizedPhone)) {
          setError('Enter a valid Safaricom (07...) or Ethio Telecom (09...) number.')
          return false
        }
      }

      return true
    }

    if (currentStep === 2) {
      if (!form.department) {
        setError('Department is required.')
        return false
      }

      if (!form.position.trim()) {
        setError('Job title is required.')
        return false
      }

      if (!form.hireDate) {
        setError('Join date is required.')
        return false
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(form.hireDate)) {
        setError('Join date must use a four-digit year.')
        return false
      }

      return true
    }

    return true
  }

  function handleContinue() {
    if (!validateStep(step)) {
      return
    }

    setStep((current) =>
      Math.min(current + 1, 4),
    )
  }

  function handleBack() {
    setError('')

    setStep((current) =>
      Math.max(current - 1, 1),
    )
  }

  function buildEmployeeData() {
    const firstName =
      form.firstName.trim()

    const lastName =
      form.lastName.trim()

    const grandfatherName =
      form.grandfatherName.trim()

    return {
      ...form,

      employeeId:
        form.employeeId.trim(),

      firstName,
      grandfatherName,
      lastName,

      name:
        [firstName, grandfatherName, lastName].filter(Boolean).join(' '),

      gender:
        form.gender || 'Male',

      dateOfBirth:
        form.dateOfBirth,

      position:
        form.position.trim(),

      jobTitle:
        form.position.trim(),

      department:
        form.department,

      employmentType:
        form.employmentType,

      status:
        form.status,

      employmentStatus:
        form.status,

      hireDate:
        form.hireDate,

      joinDate:
        form.hireDate,

      basicSalary:
        Number(form.basicSalary || 0),

      transportAllowance:
        Number(
          form.transportAllowance || 0,
        ),

      housingAllowance:
        Number(
          form.housingAllowance || 0,
        ),

      mealAllowance:
        Number(
          form.mealAllowance || 0,
        ),

      otherAllowance:
        Number(
          form.otherAllowance || 0,
        ),

      bankName:
        form.bankName.trim(),

      bankAccount:
        form.bankAccount.trim(),

      tin:
        form.tin.trim(),

      pensionId:
        form.pensionId.trim(),

      phone:
        form.phone.trim(),

      email:
        form.email.trim(),

      address:
        form.address.trim(),

      emergencyContact:
        form.emergencyContact.trim(),

      notes:
        form.notes.trim(),
    }
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (step < 4) {
      handleContinue()
      return
    }

    if (!validateStep(1)) {
      setStep(1)
      return
    }

    if (!validateStep(2)) {
      setStep(2)
      return
    }

    onSave(buildEmployeeData())
  }

  const steps = [
    {
      number: 1,
      title: 'Identification',
    },
    {
      number: 2,
      title: 'Employment',
    },
    {
      number: 3,
      title: 'Compensation',
    },
    {
      number: 4,
      title: 'Review',
    },
  ]

  return (
    <div className="fixed inset-0 z-50">

      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
        onClick={() => {
          if (!saving) {
            onClose()
          }
        }}
      />

      {/* Drawer */}
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">

        {/* Header */}
        <div className="shrink-0 border-b border-slate-100 bg-white">

          <div className="flex items-center justify-between px-5 py-5 sm:px-7">

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                Employee Management
              </p>

              <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                Add Employee
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Step {step} of 4
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            >
              <X size={20} />
            </button>

          </div>

          {/* Step indicator */}
          <div className="px-5 pb-5 sm:px-7">

            <div className="flex items-center gap-2">

              {steps.map(
                (item, index) => (
                  <div
                    key={item.number}
                    className="flex min-w-0 flex-1 items-center gap-2"
                  >

                    <button
                      type="button"
                      onClick={() => {
                        if (
                          item.number < step
                        ) {
                          setError('')
                          setStep(
                            item.number,
                          )
                        }
                      }}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${step === item.number
                          ? 'bg-[#4755AE] text-white'
                          : step >
                            item.number
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                    >
                      {item.number}
                    </button>

                    <span
                      className={`hidden truncate text-xs font-semibold sm:block ${step === item.number
                          ? 'text-slate-900'
                          : 'text-slate-400'
                        }`}
                    >
                      {item.title}
                    </span>

                    {index <
                      steps.length - 1 && (
                        <div className="h-px flex-1 bg-slate-200" />
                      )}

                  </div>
                ),
              )}

            </div>

          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >

          <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">

            {/* STEP 1 */}
            {step === 1 && (
              <div className="animate-add-step">

                <SectionTitle
                  icon={Users}
                  title="Employee Identification"
                />

                <div className="grid gap-4 sm:grid-cols-2">

                  <Field
                    label="Employee ID"
                  >
                    <input
                      className={inputClassName()}
                      value={form.employeeId}
                      readOnly
                    />
                  </Field>

                  <Field
                    label="Gender"
                  >
                    <select
                      className={inputClassName()}
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                    >
                      {(dynamicSettings?.genders || fallback_GENDERS).map(
                        (gender) => (
                          <option
                            key={gender}
                            value={gender}
                          >
                            {gender}
                          </option>
                        ),
                      )}
                    </select>
                  </Field>

                  <Field
                    label="First Name"
                    required
                  >
                    <input
                      className={inputClassName()}
                      name="firstName"
                      value={form.firstName}
                      onChange={handleChange}
                      placeholder="e.g. Abebe"
                    />
                  </Field>

                  <Field
                    label="Last Name"
                    required
                  >
                    <input
                      className={inputClassName()}
                      name="lastName"
                      value={form.lastName}
                      onChange={handleChange}
                      placeholder="e.g. Kebede"
                    />
                  </Field>

                  <Field label="Grandfather Name (Optional)">
                    <input
                      className={inputClassName()}
                      name="grandfatherName"
                      value={form.grandfatherName}
                      onChange={handleChange}
                      placeholder="e.g. Bekele"
                    />
                  </Field>

                  <Field
                    label="Date of Birth"
                    required
                  >
                    <input
                      type="date"
                      className={inputClassName()}
                      name="dateOfBirth"
                      value={form.dateOfBirth}
                      max="9999-12-31"
                      onChange={handleChange}
                    />
                  </Field>

                  <Field
                    label="Email"
                    required
                    hint="Filled from the name. You can change it."
                  >
                    <input
                      type="email"
                      className={inputClassName()}
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="employee@yanoltech.com"
                    />
                  </Field>

                  <Field label="Phone">
                    <PhoneFieldInput value={form.phone} onChange={handleChange} />
                  </Field>

                  <Field label="Address">
                    <input
                      className={inputClassName()}
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="Employee address"
                    />
                  </Field>

                  <Field label="Emergency Contact">
                    <input
                      className={inputClassName()}
                      name="emergencyContact"
                      value={form.emergencyContact}
                      onChange={handleChange}
                      placeholder="Name / phone"
                    />
                  </Field>

                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="animate-add-step">

                <SectionTitle
                  icon={BriefcaseBusiness}
                  title="Employment Information"
                />

                <div className="grid gap-4 sm:grid-cols-2">

                  <Field
                    label="Department"
                    required
                  >
                    <select className={inputClassName()} name="department" value={form.department} onChange={handleChange}>
                      <option value="">Select department</option>
                      {availableDepartments.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => { setAddingSetting('departments'); setNewSettingValue('') }} className="text-xs font-semibold text-[#4755AE]">+ Add department</button>
                    </div>
                  </Field>

                  <Field
                    label="Job Title"
                    required
                  >
                    <select className={inputClassName()} name="position" value={form.position} onChange={handleChange}>
                      <option value="">Select job title</option>
                      {settingLists.jobTitles.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <button type="button" onClick={() => { setAddingSetting('jobTitles'); setNewSettingValue('') }} className="mt-2 text-xs font-semibold text-[#4755AE]">+ Add job title</button>
                  </Field>

                  <Field label="Employment Type">
                    <select
                      className={inputClassName()}
                      name="employmentType"
                      value={form.employmentType}
                      onChange={handleChange}
                    >
                      {settingLists.employmentTypes.map(
                        (type) => (
                          <option
                            key={type}
                            value={type}
                          >
                            {type}
                          </option>
                        ),
                      )}
                    </select>
                    <button type="button" onClick={() => { setAddingSetting('employmentTypes'); setNewSettingValue('') }} className="mt-2 text-xs font-semibold text-[#4755AE]">+ Add employment type</button>
                  </Field>

                  <Field label="Employment Status">
                    <select
                      className={inputClassName()}
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                    >
                      {settingLists.employmentStatuses.map(
                        (status) => (
                          <option
                            key={status}
                            value={status}
                          >
                            {status}
                          </option>
                        ),
                      )}
                    </select>
                  </Field>

                  <Field
                    label="Join Date"
                    required
                  >
                    <input
                      type="date"
                      className={inputClassName()}
                      name="hireDate"
                      value={form.hireDate}
                      max="9999-12-31"
                      onChange={handleChange}
                    />
                  </Field>

                  <Field label="Notes">
                    <textarea
                      className={`${inputClassName()} min-h-[110px] resize-none`}
                      name="notes"
                      value={form.notes}
                      onChange={handleChange}
                      placeholder="Additional employee notes"
                    />
                  </Field>

                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="animate-add-step space-y-8">

                {/* Compensation */}
                <section>
                  <SectionTitle
                    icon={Building2}
                    title="Compensation"
                  />

                  <div className="grid gap-4 sm:grid-cols-2">

                    <Field label="Basic Salary">
                      <input
                        type="number"
                        min="0"
                        className={inputClassName()}
                        name="basicSalary"
                        value={form.basicSalary}
                        onChange={handleChange}
                        placeholder="0.00"
                      />
                    </Field>

                    <Field label="Transport Allowance">
                      <input
                        type="number"
                        min="0"
                        className={inputClassName()}
                        name="transportAllowance"
                        value={form.transportAllowance}
                        onChange={handleChange}
                        placeholder="0.00"
                      />
                    </Field>

                    <Field label="Housing Allowance">
                      <input
                        type="number"
                        min="0"
                        className={inputClassName()}
                        name="housingAllowance"
                        value={form.housingAllowance}
                        onChange={handleChange}
                        placeholder="0.00"
                      />
                    </Field>

                    <Field label="Meal Allowance">
                      <input
                        type="number"
                        min="0"
                        className={inputClassName()}
                        name="mealAllowance"
                        value={form.mealAllowance}
                        onChange={handleChange}
                        placeholder="0.00"
                      />
                    </Field>

                    <Field label="Other Allowance">
                      <input
                        type="number"
                        min="0"
                        className={inputClassName()}
                        name="otherAllowance"
                        value={form.otherAllowance}
                        onChange={handleChange}
                        placeholder="0.00"
                      />
                    </Field>

                  </div>
                </section>

                {/* Payroll */}
                <section>
                  <SectionTitle
                    icon={Building2}
                    title="Payroll Information"
                  />

                  <div className="grid gap-4 sm:grid-cols-2">

                    <Field label="Bank Name">
                      <div className="flex items-center gap-2">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#4755AE]" aria-label={form.bankName || 'Bank'}>
                          {form.bankName ? <span className="text-xs font-bold">{form.bankName.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()}</span> : <Building2 size={18} />}
                        </span>
                        <select className={inputClassName()} name="bankName" value={form.bankName} onChange={(event) => {
                          if (event.target.value === '__add_bank__') { setAddingBank(true); return }
                          handleChange(event)
                        }}>
                          <option value="">Select bank or service</option>
                          {bankNames.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
                          {form.bankName && !bankNames.includes(form.bankName) && <option value={form.bankName}>{form.bankName}</option>}
                          <option value="__add_bank__">+ Add bank name</option>
                        </select>
                      </div>
                      {addingBank && <div className="mt-2 flex gap-2">
                        <input className={`${inputClassName()} flex-1`} value={newBankName} onChange={(event) => setNewBankName(event.target.value)} placeholder="Enter bank or service name" />
                        <button type="button" className="rounded-xl bg-[#4755AE] px-3 text-sm font-semibold text-white" onClick={() => {
                          const name = newBankName.trim()
                          if (!name) return
                          setBankNames((current) => current.includes(name) ? current : [...current, name])
                          setForm((current) => ({ ...current, bankName: name }))
                          setNewBankName('')
                          setAddingBank(false)
                        }}>Add</button>
                      </div>}
                    </Field>

                    <Field label="Bank Account">
                      <input
                        className={inputClassName()}
                        name="bankAccount"
                        value={form.bankAccount}
                        onChange={handleChange}
                        placeholder="Account number"
                      />
                    </Field>

                    <Field label="TIN">
                      <input
                        className={inputClassName()}
                        name="tin"
                        value={form.tin}
                        onChange={handleChange}
                        placeholder="Tax Identification Number"
                      />
                    </Field>

                    <Field label="Pension / SSN ID">
                      <input
                        className={inputClassName()}
                        name="pensionId"
                        value={form.pensionId}
                        onChange={handleChange}
                        placeholder="Pension ID"
                      />
                    </Field>

                  </div>
                </section>

              </div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <div className="animate-add-step">

                <div className="mb-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Users size={20} />
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-slate-900">
                    Review Employee
                  </h3>

                  <p className="mt-2 text-base text-slate-500 sm:text-[17px]">
                    Review the information before creating the employee.
                  </p>
                </div>

                <div className="space-y-4">

                  {/* Identity */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">
                        Employee Identification
                      </h4>

                      <button
                        type="button"
                        onClick={() => {
                          setError('')
                          setStep(1)
                        }}
                        className="text-xs font-semibold text-[#4755AE] hover:underline"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">

                      <InfoItem
                        label="Employee ID"
                        value={form.employeeId}
                      />

                      <InfoItem
                        label="Full Name"
                        value={[form.firstName, form.grandfatherName, form.lastName].filter(Boolean).join(' ')}
                      />

                      <InfoItem
                        label="Gender"
                        value={form.gender}
                      />

                      <InfoItem
                        label="Date of Birth"
                        value={formatDate(form.dateOfBirth)}
                      />

                      <InfoItem
                        label="Email"
                        value={form.email}
                      />

                      <InfoItem
                        label="Phone"
                        value={form.phone}
                      />

                      <InfoItem
                        label="Address"
                        value={form.address}
                      />

                      <InfoItem
                        label="Emergency Contact"
                        value={form.emergencyContact}
                      />

                    </div>
                  </div>

                  {/* Employment */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">
                        Employment Information
                      </h4>

                      <button
                        type="button"
                        onClick={() => {
                          setError('')
                          setStep(2)
                        }}
                        className="text-xs font-semibold text-[#4755AE] hover:underline"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">

                      <InfoItem
                        label="Department"
                        value={form.department}
                      />

                      <InfoItem
                        label="Job Title"
                        value={form.position}
                      />

                      <InfoItem
                        label="Employment Type"
                        value={form.employmentType}
                      />

                      <InfoItem
                        label="Status"
                        value={form.status}
                      />

                      <InfoItem
                        label="Join Date"
                        value={formatDate(form.hireDate)}
                      />

                      <InfoItem
                        label="Notes"
                        value={form.notes}
                      />

                    </div>
                  </div>

                  {/* Compensation */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">
                        Compensation
                      </h4>

                      <button
                        type="button"
                        onClick={() => {
                          setError('')
                          setStep(3)
                        }}
                        className="text-xs font-semibold text-[#4755AE] hover:underline"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">

                      <InfoItem
                        label="Basic Salary"
                        value={`ETB ${formatCurrency(
                          form.basicSalary,
                        )}`}
                      />

                      <InfoItem
                        label="Transport Allowance"
                        value={`ETB ${formatCurrency(
                          form.transportAllowance,
                        )}`}
                      />

                      <InfoItem
                        label="Housing Allowance"
                        value={`ETB ${formatCurrency(
                          form.housingAllowance,
                        )}`}
                      />

                      <InfoItem
                        label="Meal Allowance"
                        value={`ETB ${formatCurrency(
                          form.mealAllowance,
                        )}`}
                      />

                      <InfoItem
                        label="Other Allowance"
                        value={`ETB ${formatCurrency(
                          form.otherAllowance,
                        )}`}
                      />

                    </div>
                  </div>

                  {/* Payroll */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">
                        Payroll Information
                      </h4>

                      <button
                        type="button"
                        onClick={() => {
                          setError('')
                          setStep(3)
                        }}
                        className="text-xs font-semibold text-[#4755AE] hover:underline"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">

                      <InfoItem
                        label="Bank Name"
                        value={form.bankName}
                      />

                      <InfoItem
                        label="Bank Account"
                        value={form.bankAccount}
                      />

                      <InfoItem
                        label="TIN"
                        value={form.tin}
                      />

                      <InfoItem
                        label="Pension / SSN ID"
                        value={form.pensionId}
                      />

                    </div>
                  </div>

                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {addingSetting && (
              <div className="mt-4 flex gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <input
                  autoFocus
                  className={`${inputClassName()} flex-1`}
                  value={newSettingValue}
                  onChange={(event) => setNewSettingValue(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addSettingOption(addingSetting) } }}
                  placeholder={`New ${addingSetting === 'jobTitles' ? 'job title' : addingSetting === 'employmentTypes' ? 'employment type' : addingSetting === 'employmentStatuses' ? 'employment status' : 'department'}`}
                />
                <button type="button" onClick={() => addSettingOption(addingSetting)} className="rounded-xl bg-[#4755AE] px-3 py-2 text-sm font-semibold text-white">Add</button>
                <button type="button" onClick={() => { setAddingSetting(''); setNewSettingValue('') }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">Cancel</button>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4 sm:px-7">

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">

              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <div className="flex gap-3">

                {step > 1 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Back
                  </button>
                )}

                {step < 4 ? (
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[#4755AE] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d4998] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[#4755AE] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d4998] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving
                      ? 'Adding Employee...'
                      : 'Add Employee'}
                  </button>
                )}

              </div>

            </div>
          </div>

        </form>
      </aside>

      <style>{`
        @keyframes addEmployeeStep {
          from {
            opacity: 0;
            transform: translateX(12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-add-step {
          animation: addEmployeeStep 220ms ease-out;
        }
      `}</style>
    </div>
  )
}

function TemporaryCredentialsModal({ credentials, onClose }) {
  const [copied, setCopied] = useState('')

  async function copyText(value, type) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(type)
      window.setTimeout(() => setCopied(''), 1800)
    } catch (error) {
      console.error('Copy credentials error:', error)
    }
  }

  async function copyCredentials() {
    const text = [
      `Employee: ${credentials.employeeName || 'Employee'}`,
      `Employee ID: ${credentials.employeeId || ''}`,
      `Login email: ${credentials.email || ''}`,
      `Temporary password: ${credentials.temporaryPassword || ''}`,
    ].join('\n')

    await copyText(text, 'all')
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check size={21} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Employee Added
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                The employee and their login account have been created. Share the login email and temporary password below with them.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Employee
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {credentials.employeeName || 'Employee'}
            </p>
            {credentials.employeeId && (
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Employee ID: {credentials.employeeId}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Login Email
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
              <input
                readOnly
                value={credentials.email || ''}
                className="min-w-0 flex-1 bg-transparent px-2 text-sm font-semibold text-slate-800 outline-none"
              />
              <button
                type="button"
                onClick={() => copyText(credentials.email || '', 'email')}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
              >
                {copied === 'email' ? <Check size={14} /> : <Copy size={14} />}
                {copied === 'email' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Temporary Password
            </label>
            {/* Always shown. Nothing is emailed to the employee's address, so
                this is the only copy of the password that exists - the HR Admin
                reads it out or copies it across. */}
            {credentials.temporaryPassword ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-2">
                  <KeyRound size={15} className="shrink-0 text-amber-600" />
                  <input
                    readOnly
                    value={credentials.temporaryPassword}
                    aria-label="Temporary password"
                    className="min-w-0 flex-1 bg-transparent font-mono text-sm font-bold text-amber-900 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyText(credentials.temporaryPassword, 'password')}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-100 px-2.5 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-amber-200"
                  >
                    {copied === 'password' ? <Check size={13} /> : <Copy size={13} />}
                    {copied === 'password' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="mt-2 text-xs leading-5 text-amber-800">
                  Share this with the employee - it is not emailed, and the
                  employee will be asked to change it the first time they sign
                  in.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                The password is not available to display. Use &quot;Reset
                Temporary Password&quot; on this employee to issue a new one.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
            The employee signs in with this email and the temporary password, and is required to set their own password immediately afterwards.
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={copyCredentials}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {copied === 'all' ? <Check size={16} /> : <Copy size={16} />}
            {copied === 'all' ? 'Credentials Copied' : 'Copy Credentials'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#4755AE] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d4998]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   VIEW EMPLOYEE
========================================================= */

function EmployeeViewModal({
  employee,
  onClose,
  onResetPassword,
}) {
  const [resetPasswordNotice, setResetPasswordNotice] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [downloadingResume, setDownloadingResume] = useState(false)

  if (!employee) return null

  const name =
    getEmployeeName(employee)

  const skills = String(employee.skills || '')
    .split(/[\n,]/)
    .map((skill) => skill.trim())
    .filter(Boolean)

  async function resetPasswordForEmployee() {
    if (resettingPassword) return
    if (!confirmReset) { setConfirmReset(true); return }
    setConfirmReset(false)
    setResettingPassword(true)
    setResetPasswordNotice('')
    try {
      // Nothing is emailed to the employee, so the new password comes back
      // here to be shown once for the HR Admin to share.
      const data = await onResetPassword(employee)
      setResetPasswordNotice(
        data?.temporaryPassword
          ? `New temporary password: ${data.temporaryPassword} — share it with the employee. It expires once they sign in.`
          : 'The password was reset, but the new value could not be displayed. Try again.',
      )
    } catch (error) {
      window.alert(error.message || 'Failed to reset employee password')
    } finally {
      setResettingPassword(false)
    }
  }

  async function downloadResume() {
    if (downloadingResume) return
    setDownloadingResume(true)
    try {
      const blob = await downloadEmployeeResume(employee.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = employee.resumeFileName || 'resume'
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      window.alert(error.message || 'Failed to download employee resume')
    } finally {
      setDownloadingResume(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
              Employee Directory
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Employee Details
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
          >
            <X size={19} />
          </button>

        </div>

        <div className="p-6">

          <div className="flex flex-col gap-4 rounded-2xl bg-slate-50 p-5 sm:flex-row sm:items-center">

            {employee.avatar ? (
              <img
                src={employee.avatar}
                alt={name}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#4755AE] text-xl font-bold text-white">
                {getInitials(employee)}
              </div>
            )}

            <div className="min-w-0">

              <div className="flex flex-wrap items-center gap-2">

                <h3 className="text-xl font-bold text-slate-950">
                  {name}
                </h3>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(
                    employee.status,
                  )}`}
                >
                  {employee.status}
                </span>

              </div>

              <p className="mt-1 text-sm text-slate-500">
                {employee.jobTitle ||
                  employee.position ||
                  'Employee'}
              </p>

              <p className="mt-1 text-xs font-medium text-slate-400">
                {getEmployeeId(employee)}
              </p>

              {employee.terminatedAt && (
                <p className="mt-1 text-xs font-semibold text-rose-600">
                  Terminated: {formatDate(employee.terminatedAt)}
                </p>
              )}

            </div>
          </div>

          <section className="mt-6 rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2">
              <Link2 size={16} className="text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Professional Profile</h3>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ['GitHub', employee.githubUrl],
                ['LinkedIn', employee.linkedinUrl],
                ['Portfolio', employee.portfolioUrl],
              ].map(([label, url]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1.5 inline-flex max-w-full items-center gap-1.5 break-all text-sm font-semibold text-[#4755AE] hover:underline"
                    >
                      {url}
                      <ExternalLink size={13} className="shrink-0" />
                    </a>
                  ) : (
                    <p className="mt-1.5 text-sm text-slate-400">Not provided</p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Skills</p>
              {skills.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span key={skill} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1.5 text-sm text-slate-400">No skills provided</p>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <FileText size={17} className="shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Resume / CV</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                    {employee.resumeFileName || 'No resume uploaded'}
                  </p>
                </div>
              </div>
              {employee.resumeFileName && (
                <button
                  type="button"
                  onClick={downloadResume}
                  disabled={downloadingResume}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50"
                >
                  <Download size={14} />
                  {downloadingResume ? 'Downloading…' : 'Download resume'}
                </button>
              )}
            </div>
          </section>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">

            <InfoItem
              label="Department"
              value={employee.department}
            />

            <InfoItem
              label="Employment Type"
              value={employee.employmentType}
            />

            <InfoItem
              label="Date of Birth"
              value={formatDate(
                employee.dateOfBirth,
              )}
            />

            <InfoItem
              label="Date Joined"
              value={formatDate(
                employee.joinDate,
              )}
            />

            <InfoItem
              label="Email"
              value={employee.email}
            />

            <InfoItem
              label="Phone"
              value={employee.phone}
            />

            <InfoItem
              label="Basic Salary"
              value={`ETB ${formatCurrency(
                employee.basicSalary,
              )}`}
            />

            <InfoItem
              label="Bank"
              value={
                employee.bankName ||
                  employee.bankAccount
                  ? `${employee.bankName || 'Bank'}${employee.bankAccount
                    ? ` · ${employee.bankAccount}`
                    : ''
                  }`
                  : '—'
              }
            />

            <InfoItem
              label="TIN"
              value={employee.tin}
            />

            <InfoItem
              label="Pension / SSN ID"
              value={employee.pensionId}
            />

            <InfoItem
              label="Address"
              value={employee.address}
            />

            <InfoItem
              label="Emergency Contact"
              value={
                employee.emergencyContact
              }
            />

          </div>

          {onResetPassword && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
              <div className="flex items-center gap-2">
                <KeyRound size={16} className="text-amber-700" />
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Employee Login Password</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">
                Reset the login if the employee lost their temporary password. The new one is shown here to pass on, and they must change it after signing in.
              </p>
              <button
                type="button"
                onClick={resetPasswordForEmployee}
                disabled={resettingPassword}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#4755AE] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#3d4998] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <KeyRound size={13} />
                {resettingPassword ? 'Resetting...' : 'Reset Temporary Password'}
              </button>
              {confirmReset && <div className="mt-3 rounded-xl border border-amber-200 bg-white p-3"><p className="text-sm font-semibold text-slate-800">Reset the login password for {name}?</p><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setConfirmReset(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">Cancel</button><button type="button" onClick={resetPasswordForEmployee} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white">Confirm reset</button></div></div>}
              {resetPasswordNotice && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-white p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Temporary password issued</p>
                  <p className="mt-1 text-xs leading-5 text-slate-700">{resetPasswordNotice}</p>
                </div>
              )}
            </div>
          )}

          {employee.notes && (
            <div className="mt-5 rounded-2xl border border-slate-200 p-4">

              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Notes
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {employee.notes}
              </p>

            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function InfoItem({
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4">

      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1.5 break-words text-sm font-semibold text-slate-800">
        {value || '—'}
      </p>

    </div>
  )
}

/* =========================================================
   EMPLOYEE CARD
========================================================= */

function EmployeeCard({
  employee,
  index,
  selected,
  onToggleSelected,
  onEdit,
  onView,
  onDelete,
  onRestore,
}) {
  const name =
    getEmployeeName(employee)

  const position =
    employee.jobTitle ||
    employee.position ||
    'Employee'

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">

      <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-2"><input type="checkbox" checked={selected} onChange={(event) => onToggleSelected(employee.id, event.target.checked)} aria-label={`Select ${name}`} /> #{index + 1}</span>
        <span>{getEmployeeId(employee)}</span>
      </div>

      <div className="flex items-start justify-between">

        <div className="flex items-center gap-3">

          {employee.avatar ? (
            <img
              src={employee.avatar}
              alt={name}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
              {getInitials(employee)}
            </div>
          )}

          <div className="min-w-0">

            <h3 className="truncate text-sm font-bold text-slate-900">
              {name}
            </h3>

            <p className="mt-0.5 truncate text-xs text-slate-500">
              {position}
            </p>

          </div>
        </div>

        <div className="relative">

          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClasses(
              employee.status,
            )}`}
          >
            {employee.status}
          </span>

        </div>
      </div>

      <div className="mt-4">

        <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-400">
          {getEmployeeId(employee)}
        </span>

      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">

        <div>

          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Department
          </p>

          <p className="mt-1 truncate text-xs font-semibold text-slate-700">
            {employee.department || '—'}
          </p>

        </div>

        <div>

          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Date of Joining
          </p>

          <p className="mt-1 truncate text-xs font-semibold text-slate-700">
            {formatDate(
              employee.joinDate,
            )}
          </p>

        </div>

      </div>

      <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2">

        <div className="flex min-w-0 items-center gap-2 border-b border-slate-200 py-2">

          <Mail
            size={14}
            className="shrink-0 text-slate-400"
          />

          <span className="truncate text-xs text-slate-600">
            {employee.email ||
              'No email'}
          </span>

        </div>

        <div className="flex min-w-0 items-center gap-2 py-2">

          <Phone
            size={14}
            className="shrink-0 text-slate-400"
          />

          <span className="truncate text-xs text-slate-600">
            {employee.phone ||
              'No phone'}
          </span>

        </div>

      </div>

      <div className={onEdit ? 'mt-4 grid grid-cols-2 gap-2' : 'mt-4 grid gap-2'}>

        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(employee)}
            className="rounded-xl bg-blue-100 px-3 py-2.5 text-xs font-bold text-[#4755AE] transition hover:bg-blue-200"
          >
            Edit
          </button>
        )}

        <button
          type="button"
          onClick={() => onView(employee)}
          className="rounded-xl bg-[#4755AE] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#3d4998]"
        >
          View
        </button>

      </div>

      {employee.isArchived || employee.status === 'Terminated' || employee.status === 'Archived' ? (
        onRestore && (
          <button
            type="button"
            onClick={() => onRestore(employee)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-purple-50 px-3 py-2 text-[11px] font-semibold text-purple-700 transition hover:bg-purple-100"
          >
            <RotateCcw size={13} />
            Restore Employee
          </button>
        )
      ) : (
        onDelete && (
          <button
            type="button"
            onClick={() => onDelete(employee)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50"
          >
            <Trash2 size={13} />
            Delete Employee
          </button>
        )
      )}

    </article>
  )
}

function EmployeeTable({
  employees,
  onEdit,
  onView,
  onDelete,
  onRestore,
  canEdit,
  onQuickUpdate,
  selectedIds,
  onToggleSelected,
  onToggleAll,
}) {
  const [editingRowId, setEditingRowId] = useState(null)
  const [draftEmployeeId, setDraftEmployeeId] = useState('')
  const [draftStatus, setDraftStatus] = useState('Active')
  const [savingRowId, setSavingRowId] = useState(null)
  const [actionMenuId, setActionMenuId] = useState(null)

  const statusOptions = ['Active', 'On Leave', 'Resigned', 'Terminated', 'Archived']

  function startRowEdit(employee) {
    setEditingRowId(employee.id)
    setDraftEmployeeId(getEmployeeId(employee))
    setDraftStatus(employee.status || employee.employmentStatus || 'Active')
  }

  function cancelRowEdit() {
    setEditingRowId(null)
    setDraftEmployeeId('')
    setDraftStatus('Active')
  }

  async function saveRowEdit(employee) {
    const nextEmployeeId = draftEmployeeId.trim()
    if (!nextEmployeeId) return

    setSavingRowId(employee.id)
    try {
      await onQuickUpdate(employee, {
        employeeId: nextEmployeeId,
        status: draftStatus,
        employmentStatus: draftStatus,
      })
      cancelRowEdit()
    } finally {
      setSavingRowId(null)
    }
  }

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
      <div className="overflow-x-auto min-h-[280px]">
        <Table className="min-w-[980px] w-full border-collapse">
          <Table.Header>
            <Table.Row className="bg-slate-50/90">
              <Table.Head className="px-3 py-3"><input type="checkbox" checked={employees.length > 0 && employees.every((employee) => selectedIds.includes(employee.id))} onChange={(event) => onToggleAll(employees, event.target.checked)} aria-label="Select all employees" /></Table.Head>
              <Table.Head className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">#</Table.Head>
              <Table.Head className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Employee</Table.Head>
              <Table.Head className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Employee ID</Table.Head>
              <Table.Head className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Department</Table.Head>
              <Table.Head className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Job Title</Table.Head>
              <Table.Head className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</Table.Head>
              <Table.Head className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Join Date</Table.Head>
              <Table.Head className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {employees.map((employee, index) => {
              const name = getEmployeeName(employee)
              const position = employee.jobTitle || employee.position || 'Employee'
              const openUpward = index > 0 && index >= employees.length - 2

              return (
                <Table.Row key={employee.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/80">
                  <Table.Cell className="px-3 py-3.5"><input type="checkbox" checked={selectedIds.includes(employee.id)} onChange={(event) => onToggleSelected(employee.id, event.target.checked)} aria-label={`Select ${name}`} /></Table.Cell>
                  <Table.Cell className="px-3 py-3.5 text-xs text-slate-500">{index + 1}</Table.Cell>
                  <Table.Cell className="px-4 py-3.5">
                    <div className="flex min-w-[220px] items-center gap-3">
                      {employee.avatar ? (
                        <img src={employee.avatar} alt={name} className="h-9 w-9 shrink-0 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
                          {getInitials(employee)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                        <p className="truncate text-xs text-slate-400">{employee.email || 'No email'}</p>
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="px-4 py-3.5">
                    {editingRowId === employee.id ? (
                      <input
                        value={draftEmployeeId}
                        onChange={(event) => setDraftEmployeeId(event.target.value)}
                        className="w-32 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                        aria-label={`Edit employee ID for ${name}`}
                      />
                    ) : (
                      <span className="rounded-md bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
                        {getEmployeeId(employee)}
                      </span>
                    )}
                  </Table.Cell>
                  <Table.Cell className="px-4 py-3.5 text-xs font-semibold text-slate-600">{employee.department || '—'}</Table.Cell>
                  <Table.Cell className="px-4 py-3.5 text-xs font-semibold text-slate-600">{position}</Table.Cell>
                  <Table.Cell className="px-4 py-3.5">
                    {editingRowId === employee.id ? (
                      <select
                        value={draftStatus}
                        onChange={(event) => setDraftStatus(event.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                        aria-label={`Edit status for ${name}`}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`rounded-full px-2.5 py-1 ${statusClasses(employee.status)} text-[10px] font-bold uppercase tracking-wide`}>
                        {employee.status}
                      </span>
                    )}
                  </Table.Cell>
                  <Table.Cell className="px-4 py-3.5 text-xs font-semibold text-slate-600">{formatDate(employee.joinDate)}</Table.Cell>
                  <Table.Cell className="px-4 py-3.5">
                    <div className="flex justify-end gap-2">
                      {editingRowId === employee.id ? (
                        <>
                          <button type="button" onClick={() => saveRowEdit(employee)} disabled={savingRowId === employee.id} className="rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                            {savingRowId === employee.id ? 'Saving...' : 'Save'}
                          </button>
                          <button type="button" onClick={cancelRowEdit} disabled={savingRowId === employee.id} className="rounded-lg bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-60">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <TableRowMenu
                          open={actionMenuId === employee.id}
                          onOpenChange={(open) => setActionMenuId(open ? employee.id : null)}
                          triggerLabel={`Actions for ${name}`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActionMenuId(null)
                              onView(employee)
                            }}
                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                          >
                            <Eye size={14} className="text-slate-400" />
                            <span>View</span>
                          </button>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                setActionMenuId(null)
                                startRowEdit(employee)
                              }}
                              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#0092B8] transition hover:bg-[#0092B8]/10"
                            >
                              <Pencil size={14} className="text-[#0092B8]" />
                              <span>Edit</span>
                            </button>
                          )}
                          {(employee.isArchived || employee.status === 'Terminated' || employee.status === 'Archived') ? (
                            onRestore && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActionMenuId(null)
                                  onRestore(employee)
                                }}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-purple-600 transition hover:bg-purple-50"
                              >
                                <RotateCcw size={14} className="text-purple-500" />
                                <span>Restore</span>
                              </button>
                            )
                          ) : (
                            onDelete && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActionMenuId(null)
                                  onDelete(employee)
                                }}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                              >
                                <Trash2 size={14} className="text-rose-500" />
                                <span>Delete Employee</span>
                              </button>
                            )
                          )}
                        </TableRowMenu>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table>
      </div>
    </div>
  )
}

/* =========================================================
   EMPLOYEES PAGE
========================================================= */

export default function Employees() {
  const [searchParams] = useSearchParams()

  // Which actions this account may take. Every one of these also has a matching
  // permission check on the API route, so hiding a control and being refused by
  // the server are the same decision made twice.
  const { can } = useAccess()
  const canAdd = can('employees.add')
  const canEdit = can('employees.edit')
  const canDelete = can('employees.delete')
  const canResetPassword = can('employees.reset_password')
  const [employees, setEmployees] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  const [successMessage, setSuccessMessage] =
    useState('')
  const [temporaryCredentials, setTemporaryCredentials] =
    useState(null)

  const [search, setSearch] =
    useState('')

  useEffect(() => {
    const query = searchParams.get('search')
    setSearch(query || '')
  }, [searchParams])

  const [departmentFilter, setDepartmentFilter] =
    useState('All')

  const [statusFilter, setStatusFilter] =
    useState('All')

  const [modalOpen, setModalOpen] =
    useState(false)

  const [editingEmployee, setEditingEmployee] =
    useState(null)

  const [viewEmployee, setViewEmployee] =
    useState(null)

  const [activeSummaryCard, setActiveSummaryCard] =
    useState(null)

  const [directoryView, setDirectoryView] =
    useState('card')
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([])
  const [pendingDelete, setPendingDelete] = useState(null)
  const [dynamicSettings, setDynamicSettings] = useState(null)

  async function loadSettings() {
    try {
      const response = await fetch(`${API_URL}/settings`, {
        headers: authHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setDynamicSettings(data)
      }
    } catch (err) {
      console.error('Load settings error:', err)
    }
  }

  async function loadEmployees() {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(
        `${API_URL}/employees`,
        {
          cache: 'no-store',
          headers: authHeaders(),
        },
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data?.message ||
          data?.error ||
          'Unable to load employees.',
        )
      }

      setEmployees(
        Array.isArray(data)
          ? data.map(normalizeEmployee)
          : [],
      )
    } catch (err) {
      console.error(
        'Load employees error:',
        err,
      )

      setError(
        err.message ||
        'Unable to load employees.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function importEmployees(rows) {
    let next = 1
    const existingIds = new Set(employees.map((employee) => String(employee.employeeId || '').trim()))
    let imported = 0
    for (const row of rows) {
      const name = String(row.name || `${row.firstName || ''} ${row.lastName || ''}`.trim()).trim()
      const email = String(row.email || '').trim()
      if (!name || !email) continue
      while (existingIds.has(String(next).padStart(4, '0'))) next += 1
      const employeeId = String(row.employeeId || next.toString().padStart(4, '0')).trim()
      const payload = {
        ...row,
        employeeId,
        name,
        email,
        gender: row.gender || 'Male',
        dateOfBirth: row.dateOfBirth || '',
        joinDate: row.joinDate || row.hireDate || new Date().toISOString().slice(0, 10),
        jobTitle: row.jobTitle || row.position || '',
        department: row.department || '',
        employmentType: row.employmentType || 'Permanent',
        employmentStatus: row.employmentStatus || row.status || 'Active',
        status: row.status || row.employmentStatus || 'Active',
      }
      const response = await fetch(`${API_URL}/employees`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(`${employeeId}: ${result.message || 'Import failed.'}`)
      existingIds.add(employeeId)
      imported += 1
    }
    await loadEmployees()
    return `Imported ${imported} employee(s); rows without a name or email were skipped.`
  }

  async function handleResetPassword(employee) {
    const response = await fetch(`${API_URL}/employees/${employee.id}/reset-password`, {
      method: 'POST',
      headers: authHeaders(),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Failed to reset employee password')
    return data
  }

  useEffect(() => {
    loadEmployees()
    loadSettings()
  }, [])

  const departments = useMemo(() => {
    const fromSettings = dynamicSettings?.departments || (dynamicSettings?.departments || fallback_DEPARTMENTS)
    const fromEmployees = employees
      .map(
        (employee) =>
          employee.department,
      )
      .filter(Boolean)

    return Array.from(
      new Set([...fromSettings, ...fromEmployees]),
    )
  }, [dynamicSettings, employees])

  const filteredEmployees =
    useMemo(() => {
      const query =
        search.trim().toLowerCase()

      return employees.filter(
        (employee) => {
          const name =
            getEmployeeName(
              employee,
            ).toLowerCase()

          const employeeId =
            String(
              getEmployeeId(employee),
            ).toLowerCase()

          const email =
            String(
              employee.email || '',
            ).toLowerCase()

          const position =
            String(
              employee.position ||
              employee.jobTitle ||
              '',
            ).toLowerCase()

          const matchesSearch =
            !query ||
            name.includes(query) ||
            employeeId.includes(query) ||
            email.includes(query) ||
            position.includes(query)

          const matchesDepartment =
            departmentFilter ===
            'All' ||
            employee.department ===
            departmentFilter

          const matchesStatus =
            statusFilter === 'All'
              ? !employee.isArchived && employee.status !== 'Archived' && employee.status !== 'Terminated'
              : statusFilter === 'Archived'
                ? Boolean(employee.isArchived || employee.status === 'Archived' || employee.status === 'Terminated')
                : statusFilter === 'Terminated'
                  ? employee.status === 'Terminated'
                  : employee.status === statusFilter && !employee.isArchived

          return (
            matchesSearch &&
            matchesDepartment &&
            matchesStatus
          )
        },
      )
    }, [
      employees,
      search,
      departmentFilter,
      statusFilter,
    ])

  const activeCount =
    employees.filter(
      (employee) =>
        !employee.isArchived && employee.status === 'Active',
    ).length

  const onLeaveCount =
    employees.filter(
      (employee) =>
        !employee.isArchived &&
        employee.status ===
        'On Leave',
    ).length

  const resignedCount =
    employees.filter(
      (employee) =>
        !employee.isArchived &&
        employee.status ===
        'Resigned',
    ).length

  const archivedCount =
    employees.filter(
      (employee) =>
        employee.isArchived || employee.status === 'Archived' || employee.status === 'Terminated',
    ).length

  function openAddModal() {
    setError('')
    setSuccessMessage('')
    setEditingEmployee(null)
    setModalOpen(true)
  }

  function openEditModal(employee) {
    setError('')
    setSuccessMessage('')
    setEditingEmployee(employee)
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return

    setModalOpen(false)
    setEditingEmployee(null)
  }

  async function handleSave(employeeData) {
    try {
      setSaving(true)
      setError('')
      setSuccessMessage('')
      setTemporaryCredentials(null)

      const employeeId = employeeData.employeeId?.trim()

      if (!employeeId) {
        throw new Error('Employee ID is required.')
      }

      const databaseId =
        editingEmployee?.id ||
        employeeData.id ||
        employeeId

      const payload = {
        id: databaseId,

        employeeId,

        name:
          employeeData.name ||
          'Unnamed Employee',

        gender:
          employeeData.gender || '',

        dateOfBirth:
          employeeData.dateOfBirth || '',

        joinDate:
          employeeData.joinDate ||
          employeeData.hireDate ||
          '',

        jobTitle:
          employeeData.jobTitle ||
          employeeData.position ||
          '',

        department:
          employeeData.department || '',

        employmentType:
          employeeData.employmentType || '',

        basicSalary:
          Number(employeeData.basicSalary || 0),

        transportAllowance:
          Number(
            employeeData.transportAllowance || 0,
          ),

        housingAllowance:
          Number(
            employeeData.housingAllowance || 0,
          ),

        mealAllowance:
          Number(
            employeeData.mealAllowance || 0,
          ),

        otherAllowance:
          Number(
            employeeData.otherAllowance || 0,
          ),

        otherDeductions:
          Number(
            employeeData.otherDeductions || 0,
          ),

        loanDeductions:
          Number(
            employeeData.loanDeductions || 0,
          ),

        bankName:
          employeeData.bankName || '',

        bankAccount:
          employeeData.bankAccount || '',

        tin:
          employeeData.tin || '',

        pensionId:
          employeeData.pensionId || '',

        phone:
          employeeData.phone || '',

        email:
          employeeData.email || '',

        address:
          employeeData.address || '',

        emergencyContact:
          employeeData.emergencyContact || '',

        employmentStatus:
          employeeData.employmentStatus ||
          employeeData.status ||
          'Active',

        exitDate:
          employeeData.exitDate ||
          null,

        notes:
          employeeData.notes || '',

        status:
          employeeData.status ||
          employeeData.employmentStatus ||
          'Active',

        avatar:
          employeeData.avatar || '',

        location:
          employeeData.location || '',

        salary:
          Number(
            employeeData.salary ||
            employeeData.basicSalary ||
            0,
          ),

        manager:
          employeeData.manager || '',

        roleType:
          employeeData.roleType || '',

        initials:
          employeeData.initials ||
          getInitials(employeeData),
      }

      const isEditing =
        Boolean(editingEmployee)

      const url = isEditing
        ? `${API_URL}/employees/${editingEmployee.id}`
        : `${API_URL}/employees`

      /*
       * Both POST /employees and PUT /employees/:id sit behind requireAuth on
       * the server, so this request has to carry the HR admin's bearer token.
       *
       * It used to hand-write its headers as just Content-Type, which meant the
       * token never left the browser and the server answered a perfectly
       * signed-in admin with "Authentication required". authHeaders() is the
       * helper the rest of this file already uses; it is what puts the
       * Authorization header on the request.
       */
      const response = await fetch(
        url,
        {
          method: isEditing
            ? 'PUT'
            : 'POST',

          headers: authHeaders({
            'Content-Type':
              'application/json',
          }),

          body: JSON.stringify(payload),
        },
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          describeAuthFailure(response, data) ||
          data?.message ||
          data?.error ||
          'Failed to save employee.',
        )
      }

      /*
       * --------------------------------------------------------
       * EDIT EXISTING EMPLOYEE
       * --------------------------------------------------------
       */

      if (isEditing) {
        const savedEmployee =
          normalizeEmployee(data)

        setEmployees(
          (current) =>
            current.map(
              (employee) =>
                employee.id ===
                  editingEmployee.id
                  ? savedEmployee
                  : employee,
            ),
        )

        setSuccessMessage(
          'Employee updated successfully.',
        )

        setModalOpen(false)
        setEditingEmployee(null)

        await loadEmployees()

        return
      }

      /*
       * --------------------------------------------------------
       * NEW EMPLOYEE
       * --------------------------------------------------------
       *
       * Backend now returns:
       *
       * {
       *   employee: {...},
       *   account: {
       *     email: "...",
       *     temporaryPassword: "..."
       *   }
       * }
       */

      const savedEmployee =
        normalizeEmployee(
          data.employee,
        )

      setEmployees(
        (current) => [
          ...current,
          savedEmployee,
        ],
      )

      if (data.account) {
        setTemporaryCredentials({
          employeeId:
            data.employee?.employeeId ||
            employeeData.employeeId ||
            '',
          email:
            data.account.email || '',
          // Nothing is emailed, so the password always comes back here for the
          // HR Admin to pass on.
          temporaryPassword:
            data.account.temporaryPassword || '',
          employeeName:
            data.employee?.name ||
            employeeData.name ||
            'Employee',
        })
      }

      setSuccessMessage(
        'Employee and login account created successfully.',
      )

      setModalOpen(false)
      setEditingEmployee(null)

      await loadEmployees()
    } catch (err) {
      console.error(
        'Save employee error:',
        err,
      )

      setError(
        err.message ||
        'Unable to save employee.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleQuickTableUpdate(employee, changes) {
    try {
      setError('')
      setSuccessMessage('')

      const response = await fetch(`${API_URL}/employees/${employee.id}`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(changes),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to update employee.')
      }

      const updatedEmployee = normalizeEmployee(data)

      setEmployees((current) =>
        current.map((item) =>
          item.id === employee.id ? updatedEmployee : item,
        ),
      )

      setSuccessMessage('Employee ID and employment status updated successfully.')
    } catch (err) {
      console.error('Quick employee update error:', err)
      setError(err.message || 'Unable to update employee.')
      throw err
    }
  }

  async function handleDelete(
    employee,
  ) {
    if (!pendingDelete) {
      setPendingDelete(employee)
      return
    }

    try {
      setError('')
      setSuccessMessage('')

      const response = await fetch(
        `${API_URL}/employees/${employee.id}`,
        {
          method: 'DELETE',
          headers: authHeaders(),
        },
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          describeAuthFailure(response, data) ||
          data?.message ||
          data?.error ||
          'Failed to delete employee.',
        )
      }

      const currentTimestamp = data?.terminatedAt || new Date().toISOString()

      // When HR clicks Delete Employee, don't actually delete them.
      // Instead: status = "Terminated", isArchived = true, terminatedAt = current date/time
      setEmployees((current) =>
        current.map((item) =>
          item.id === employee.id
            ? {
                ...item,
                status: 'Terminated',
                employmentStatus: 'Terminated',
                isArchived: true,
                terminatedAt: currentTimestamp,
              }
            : item,
        ),
      )

      setSuccessMessage(
        data?.message || 'Employee terminated and archived successfully. All historical records have been preserved.',
      )
      setPendingDelete(null)
    } catch (err) {
      console.error(
        'Delete employee error:',
        err,
      )

      setError(
        err.message ||
        'Unable to delete employee.',
      )
    }
  }

  async function handleRestore(employee) {
    try {
      setError('')
      setSuccessMessage('')

      const response = await fetch(
        `${API_URL}/employees/${employee.id}/restore`,
        {
          method: 'POST',
          headers: authHeaders(),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          describeAuthFailure(response, data) ||
          data?.message ||
          data?.error ||
          'Failed to restore employee.',
        )
      }

      setEmployees((current) =>
        current.map((item) =>
          item.id === employee.id
            ? { ...item, isArchived: false, status: 'Active', employmentStatus: 'Active' }
            : item,
        ),
      )

      setSuccessMessage(
        data?.message || 'Employee restored successfully.',
      )
    } catch (err) {
      console.error(
        'Restore employee error:',
        err,
      )

      setError(
        err.message ||
        'Unable to restore employee.',
      )
    }
  }

  return (
    <div className="min-h-full bg-[#F3F4F6] text-slate-950">

      {pendingDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs">
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-employee-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200">
                <Trash2 size={20} />
              </div>
              <div>
                <h2 id="delete-employee-title" className="text-base font-bold text-slate-900">Delete Employee</h2>
                <p className="text-xs text-slate-500">Soft-delete with data preservation</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete <strong>{getEmployeeName(pendingDelete)}</strong> ({getEmployeeId(pendingDelete)})?
            </p>
            <div className="mt-3.5 rounded-xl border border-rose-200/80 bg-rose-50/70 p-3.5 text-xs leading-relaxed text-rose-900">
              <p className="font-semibold text-rose-950 flex items-center gap-1.5 mb-1">
                <Check size={14} className="text-rose-700" /> Preservation Guarantee
              </p>
              This employee will <strong>not be deleted permanently</strong>. Their status will be set to <strong>Terminated</strong>, archived (<code>isArchived = true</code>), and recorded with the termination timestamp (<code>terminatedAt</code>). All attendance, leave, and payroll records are permanently preserved.
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setPendingDelete(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Cancel</button>
              <button type="button" onClick={() => handleDelete(pendingDelete)} className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition">
                <Trash2 size={15} />
                Delete Employee
              </button>
            </div>
          </section>
        </div>
      )}

      <main className="w-full max-w-[1600px] px-5 py-6 sm:px-8">

        <PageTitle
          eyebrow="Employee Management"
          title="Manage Your Team"
          description="View, add, edit and manage all employees in your organization."
          className="animate-employee-hero mb-8 px-0 py-2"
          action={canAdd ? (
            <button
              type="button"
              onClick={openAddModal}
              className="animate-add-employee-button flex w-fit items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
            >
              <UserPlus size={18} />
              Add Employee
            </button>
          ) : null}
        />

        {/* Summary */}
        <section className="animate-employee-summary mb-9 grid gap-4 bg-[#F3F4F6] p-0 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { key: 'active', title: 'Active Roster', description: 'Active employees', value: activeCount, icon: Users, iconClass: 'bg-emerald-100 text-emerald-600' },
            { key: 'leave', title: 'On Leave', description: 'Currently on leave', value: onLeaveCount, icon: BriefcaseBusiness, iconClass: 'bg-orange-100 text-orange-600' },
            { key: 'resigned', title: 'Resigned', description: 'Former employees', value: resignedCount, icon: UserPlus, iconClass: 'bg-slate-100 text-slate-600' },
            { key: 'archived', title: 'Archived Records', description: 'Preserved employee files', value: archivedCount, icon: Archive, iconClass: 'bg-purple-100 text-purple-600' },
          ].map((stat, statIndex) => {
            const StatIcon = stat.icon
            const avatarEmployees = employees.slice(0, 4)
            const avatarColors = [
              'bg-sky-100 text-sky-700',
              'bg-rose-100 text-rose-700',
              'bg-emerald-100 text-emerald-700',
              'bg-violet-100 text-violet-700',
            ]

            return (
              <div
                key={stat.key}
                className={`animate-employee-stat group relative overflow-hidden rounded-[18px] border border-slate-200/80 bg-[#E8F1F9] p-5 shadow-[0_3px_14px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(15,23,42,0.09)] cursor-pointer ${activeSummaryCard === stat.key ? 'animate-employee-stat-click' : ''}`}
                style={{ animationDelay: `${statIndex * 120}ms` }}
                onClick={() => {
                  setActiveSummaryCard(stat.key)
                  if (stat.key === 'active') setStatusFilter('Active')
                  if (stat.key === 'leave') setStatusFilter('On Leave')
                  if (stat.key === 'resigned') setStatusFilter('Resigned')
                  if (stat.key === 'archived') setStatusFilter('Archived')
                  window.setTimeout(() => setActiveSummaryCard(null), 700)
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] ${stat.iconClass}`}>
                    <StatIcon size={20} strokeWidth={1.8} />
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/60 text-slate-500 shadow-sm ring-1 ring-slate-200/60 transition-transform duration-300 group-hover:translate-x-0.5">
                    <ArrowRight size={17} />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-[15px] font-semibold tracking-[-0.01em] text-slate-800">{stat.title}</p>
                  <p className="mt-1 text-[12px] font-medium text-slate-400">{stat.description}</p>
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-slate-400">People</p>
                    <p className="mt-0.5 text-[27px] font-bold leading-none tracking-tight text-slate-950">
                      <AnimatedStatNumber value={stat.value} />
                    </p>
                  </div>
                  {avatarEmployees.length > 0 && (
                    <div className="flex items-center pb-0.5 pl-2">
                      {avatarEmployees.slice(0, 3).map((employee, index) => {
                        const initials = employee?.initials || employee?.name?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'EM'
                        return (
                          <div
                            key={employee?.id || employee?.employeeId || index}
                            className={`relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white text-[8px] font-bold ${index > 0 ? '-ml-2' : ''} ${avatarColors[index % avatarColors.length]}`}
                            title={employee?.name || 'Employee'}
                          >
                            {employee?.photo || employee?.profileImage || employee?.avatar ? (
                              <img src={employee.photo || employee.profileImage || employee.avatar} alt="" className="h-full w-full object-cover" />
                            ) : initials}
                          </div>
                        )
                      })}
                      {employees.length > 3 && (
                        <span className="-ml-2 flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-white bg-white/80 px-1.5 text-[9px] font-bold text-slate-500 shadow-sm">
                          +{Math.max(employees.length - 3, 0)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </section>

        {/* Search + Filters */}
        <section className="animate-employee-search mb-8 rounded-2xl bg-[#F3F4F6] p-0">

          <div className="grid gap-3 lg:grid-cols-[1fr_220px_200px]">

            <div className="relative">

              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search employees..."
                className="animate-employee-search-input w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#4755AE] focus:bg-white focus:ring-2 focus:ring-[#4755AE]/10"
              />

            </div>

            <div className="relative">

              <select
                value={departmentFilter}
                onChange={(event) =>
                  setDepartmentFilter(
                    event.target.value,
                  )
                }
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm text-slate-700 outline-none focus:border-[#4755AE]"
              >

                <option value="All">
                  All Departments
                </option>

                {departments.map(
                  (department) => (
                    <option
                      key={department}
                      value={department}
                    >
                      {department}
                    </option>
                  ),
                )}

              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

            </div>

            <div className="relative">

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value,
                  )
                }
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm text-slate-700 outline-none focus:border-[#4755AE]"
              >

                <option value="All">
                  All Statuses
                </option>

                {(dynamicSettings?.employmentStatuses || fallback_STATUSES).map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  ),
                )}

              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

            </div>

          </div>
        </section>

        {/* Messages */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {successMessage}
          </div>
        )}

        {/* Directory */}
        <section>

          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-lg font-bold text-slate-900">
                Employee Directory
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Showing{' '}
                {filteredEmployees.length}{' '}
                of {employees.length}{' '}
                employees
              </p>

            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <TableDataTools
                filename="employees"
                rows={(selectedEmployeeIds.length ? employees.filter((employee) => selectedEmployeeIds.includes(employee.id)) : filteredEmployees).map((employee) => ({
                  employeeId: getEmployeeId(employee),
                  name: getEmployeeName(employee),
                  email: employee.email || '',
                  department: employee.department || '',
                  jobTitle: employee.jobTitle || employee.position || '',
                  status: employee.status || '',
                  joinDate: employee.joinDate || employee.hireDate || '',
                }))}
                onImport={canAdd ? importEmployees : undefined}
              />

              <div className="flex items-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200/70">
                <button
                  type="button"
                  onClick={() => setDirectoryView('table')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${directoryView === 'table'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                >
                  <Table2 size={15} />
                  Table
                </button>

                <button
                  type="button"
                  onClick={() => setDirectoryView('card')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${directoryView === 'card'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                >
                  <LayoutGrid size={15} />
                  Card
                </button>
              </div>

            </div>

          </div>

          {loading ? (
            <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-slate-200 bg-white">

              <div className="text-center">

                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#4755AE]" />

                <p className="mt-4 text-sm font-medium text-slate-500">
                  Loading employees...
                </p>

              </div>

            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-center">

              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Users size={24} />
              </div>

              <h3 className="mt-4 text-sm font-bold text-slate-800">
                No employees found
              </h3>

              <p className="mt-1 max-w-md text-xs text-slate-400">
                Try changing your search or filters,
                or add a new employee.
              </p>

              {canAdd && (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="mt-5 flex items-center gap-2 rounded-xl bg-[#4755AE] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#3d4998]"
                >
                  <UserPlus size={15} />
                  Add Employee
                </button>
              )}

            </div>
          ) : (
            directoryView === 'table' ? (
              <EmployeeTable
                employees={filteredEmployees}
                selectedIds={selectedEmployeeIds}
                onToggleSelected={(id, checked) => setSelectedEmployeeIds((current) => checked ? [...new Set([...current, id])] : current.filter((item) => item !== id))}
                onToggleAll={(rows, checked) => setSelectedEmployeeIds((current) => checked ? [...new Set([...current, ...rows.map((item) => item.id)])] : current.filter((id) => !rows.some((row) => row.id === id)))}
                onEdit={canEdit ? openEditModal : null}
                onView={setViewEmployee}
                onDelete={canDelete ? handleDelete : null}
                onRestore={canDelete ? handleRestore : null}
                onQuickUpdate={handleQuickTableUpdate}
                canEdit={canEdit}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {filteredEmployees.map(
                  (employee, index) => (
                    <EmployeeCard
                      key={employee.id}
                      employee={employee}
                      index={index}
                      selected={selectedEmployeeIds.includes(employee.id)}
                      onToggleSelected={(id, checked) => setSelectedEmployeeIds((current) => checked ? [...new Set([...current, id])] : current.filter((item) => item !== id))}
                      onEdit={canEdit ? openEditModal : null}
                      onView={setViewEmployee}
                      onDelete={canDelete ? handleDelete : null}
                      onRestore={canDelete ? handleRestore : null}
                    />
                  ),
                )}
              </div>
            )
          )}

        </section>

      </main>

      {/* ADD = NEW DRAWER
          EDIT = ORIGINAL MODAL */}
      {modalOpen && (
        editingEmployee ? (
          <EmployeeModal
            employee={editingEmployee}
            departments={departments}
            onClose={closeModal}
            onSave={handleSave}
            saving={saving}
          />
        ) : (
          <AddEmployeeDrawer
            departments={departments}
            employees={employees}
            onClose={closeModal}
            onSave={handleSave}
            saving={saving}
          />
        )
      )}

      {temporaryCredentials && (
        <TemporaryCredentialsModal
          credentials={temporaryCredentials}
          onClose={() => setTemporaryCredentials(null)}
        />
      )}

      {viewEmployee && (
        <EmployeeViewModal
          employee={viewEmployee}
          onResetPassword={canResetPassword ? handleResetPassword : null}
          onClose={() =>
            setViewEmployee(null)
          }
        />
      )}

      <style>{`
        @keyframes employeeHeroIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes employeeButtonIn {
          0% {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          60% {
            opacity: 1;
            transform: translateY(2px) scale(1.01);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes employeeButtonGlow {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(71, 85, 174, 0);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(71, 85, 174, 0.08);
          }
        }

        @keyframes employeeStatIn {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes employeeStatClick {
          0% {
            transform: translateY(0) scale(1);
          }
          35% {
            transform: translateY(-7px) scale(1.012);
          }
          65% {
            transform: translateY(-4px) scale(1.006);
          }
          100% {
            transform: translateY(0) scale(1);
          }
        }

        .animate-employee-stat-click {
          animation: employeeStatClick 700ms cubic-bezier(.22, 1, .36, 1);
        }

        @keyframes employeeSearchIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes employeeSearchFieldIn {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-employee-hero {
          animation: employeeHeroIn 420ms ease-out both;
        }

        .animate-add-employee-button {
          animation:
            employeeButtonIn 500ms cubic-bezier(.22, 1, .36, 1) both,
            employeeButtonGlow 2.8s ease-in-out 700ms infinite;
        }

        .animate-employee-stat {
          opacity: 0;
          animation: employeeStatIn 420ms cubic-bezier(.22, 1, .36, 1) both;
        }

        .animate-employee-search {
          animation: employeeSearchIn 480ms ease-out 180ms both;
        }

        .animate-employee-search-input {
          animation: employeeSearchFieldIn 420ms ease-out 300ms both;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-employee-hero,
          .animate-add-employee-button,
          .animate-employee-stat,
          .animate-employee-search,
          .animate-employee-search-input {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

    </div>
  )
}
