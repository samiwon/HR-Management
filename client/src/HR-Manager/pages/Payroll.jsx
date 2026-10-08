import { useEffect, useMemo, useState } from 'react'
import {
  Banknote,
  Building2,
  Calculator,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Image as ImageIcon,
  Loader2,
  MoreHorizontal,
  MinusCircle,
  Save,
  Trash2,
  Wallet,
  Users,
  X,
} from 'lucide-react'

import { Button, PageTitle, SummaryCard, Table, TableRowMenu } from '../../components/ui'
import TableDataTools from '../components/TableDataTools'
import { useAccess } from '../../lib/rbac'
import { authHeaders } from '../../lib/hrApi'
import { exportPayrollRecordsImage } from '../lib/payroll-records-image'
import { HR_SETTINGS } from '../data/settingsData'

const API_BASE = 'http://localhost:4000/api/hr-manager'

const DEFAULT_PAYROLL_CONFIGURATION = {
  overtimeRateMultiplier: 1.5,
  standardMonthlyWorkingHours: 208,
  taxablePercentOfAllowances: 1,
  employeePensionRate: 0.07,
  employerPensionRate: 0.11,
}

const PAYE_BRACKETS = [
  {
    min: 0,
    max: 2000,
    rate: 0,
    subtraction: 0,
  },
  {
    min: 2001,
    max: 4000,
    rate: 0.15,
    subtraction: 300,
  },
  {
    min: 4001,
    max: 7000,
    rate: 0.2,
    subtraction: 500,
  },
  {
    min: 7001,
    max: 10000,
    rate: 0.25,
    subtraction: 850,
  },
  {
    min: 10001,
    max: 14000,
    rate: 0.3,
    subtraction: 1350,
  },
  {
    min: 14001,
    max: Infinity,
    rate: 0.35,
    subtraction: 2050,
  },
]

const emptyPayrollForm = {
  payrollMonth: '',
  overtimeHours: 0,
  overtimePay: 0,
  loanDeduction: 0,
  otherDeduction: 0,
}

function formatCurrency(value) {
  const number = Number(value || 0)

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number)
}

function getMonthRange(month) {
  if (!month) {
    return {
      start: '',
      end: '',
    }
  }

  const [year, monthNumber] = month
    .split('-')
    .map(Number)

  const start = new Date(
    year,
    monthNumber - 1,
    1,
  )

  const end = new Date(
    year,
    monthNumber,
    0,
  )

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

function getCurrentMonth() {
  const now = new Date()

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, '0')}`
}

function calculateIncomeTax(taxableIncome) {
  const income = Math.max(
    0,
    Number(taxableIncome || 0),
  )

  const bracket =
    PAYE_BRACKETS.find(
      (item) =>
        income >= item.min &&
        income <= item.max,
    ) ||
    PAYE_BRACKETS[
      PAYE_BRACKETS.length - 1
    ]

  return Math.max(
    0,
    income * bracket.rate -
      bracket.subtraction,
  )
}

function isExcludedFromStatutoryDeductions(
  employee,
) {
  const type = String(
    employee?.employmentType ||
      employee?.employment_type ||
      '',
  ).toLowerCase()

  return (
    type === 'contractual' ||
    type === 'intern'
  )
}

function getEmployeeName(employee) {
  if (!employee) {
    return 'Unknown Employee'
  }

  if (employee.name) {
    return employee.name
  }

  const firstName =
    employee.firstName ||
    employee.first_name ||
    ''

  const lastName =
    employee.lastName ||
    employee.last_name ||
    ''

  return (
    `${firstName} ${lastName}`.trim() ||
    'Unknown Employee'
  )
}

function getEmployeeId(employee) {
  return (
    employee?.id ||
    employee?.employeeId ||
    employee?.employee_id ||
    ''
  )
}

function normalizeEmployee(employee) {
  return {
    ...employee,

    id: employee.id,

    employeeId:
      employee.employeeId ||
      employee.employee_id ||
      employee.id,

    name: getEmployeeName(employee),

    department:
      employee.department ||
      employee.departmentName ||
      employee.department_name ||
      '-',

    position:
      employee.position ||
      employee.jobTitle ||
      employee.job_title ||
      '-',

    employmentType:
      employee.employmentType ||
      employee.employment_type ||
      'Permanent',

    status:
      employee.status ||
      employee.employmentStatus ||
      employee.employment_status ||
      'Active',

    basicSalary: Number(
      employee.basicSalary ??
        employee.basic_salary ??
        employee.salary ??
        0,
    ),

    transportAllowance: Number(
      employee.transportAllowance ??
        employee.transport_allowance ??
        0,
    ),

    housingAllowance: Number(
      employee.housingAllowance ??
        employee.housing_allowance ??
        0,
    ),

    mealAllowance: Number(
      employee.mealAllowance ??
        employee.meal_allowance ??
        0,
    ),

    otherAllowance: Number(
      employee.otherAllowance ??
        employee.other_allowance ??
        0,
    ),
  }
}

function normalizePayroll(record) {
  return {
    ...record,

    id: record.id,

    employeeId:
      record.employeeId ||
      record.employee_id,

    payrollMonth:
      record.payrollMonth ||
      record.payroll_month,

    basicSalary: Number(
      record.basicSalary ??
        record.basic_salary ??
        0,
    ),

    transportAllowance: Number(
      record.transportAllowance ??
        record.transport_allowance ??
        0,
    ),

    housingAllowance: Number(
      record.housingAllowance ??
        record.housing_allowance ??
        0,
    ),

    mealAllowance: Number(
      record.mealAllowance ??
        record.meal_allowance ??
        0,
    ),

    otherAllowance: Number(
      record.otherAllowance ??
        record.other_allowance ??
        0,
    ),

    overtimePay: Number(
      record.overtimePay ??
        record.overtime_pay ??
        0,
    ),

    grossSalary: Number(
      record.grossSalary ??
        record.gross_salary ??
        0,
    ),

    pensionDeduction: Number(
      record.pensionDeduction ??
        record.pension_deduction ??
        0,
    ),

    incomeTax: Number(
      record.incomeTax ??
        record.income_tax ??
        0,
    ),

    loanDeduction: Number(
      record.loanDeduction ??
        record.loan_deduction ??
        0,
    ),

    otherDeduction: Number(
      record.otherDeduction ??
        record.other_deduction ??
        0,
    ),

    totalDeductions: Number(
      record.totalDeductions ??
        record.total_deductions ??
        0,
    ),

    netSalary: Number(
      record.netSalary ??
        record.net_salary ??
        0,
    ),

    employerPension: Number(
      record.employerPension ??
        record.employer_pension ??
        0,
    ),

    employerCost: Number(
      record.employerCost ??
        record.employer_cost ??
        0,
    ),
  }
}

function calculateOvertimePay(
  basicSalary,
  overtimeHours,
  payrollConfiguration = DEFAULT_PAYROLL_CONFIGURATION,
) {
  const salary = Number(basicSalary || 0)
  const hours = Number(overtimeHours || 0)

  const standardHours = Number(
    payrollConfiguration
      ?.standardMonthlyWorkingHours ??
      DEFAULT_PAYROLL_CONFIGURATION.standardMonthlyWorkingHours,
  )

  const multiplier = Number(
    payrollConfiguration
      ?.overtimeRateMultiplier ??
      DEFAULT_PAYROLL_CONFIGURATION.overtimeRateMultiplier,
  )

  if (
    salary <= 0 ||
    hours <= 0 ||
    standardHours <= 0 ||
    multiplier <= 0
  ) {
    return 0
  }

  const hourlyRate =
    salary / standardHours

  return Number(
    (
      hours *
      hourlyRate *
      multiplier
    ).toFixed(2),
  )
}

function calculatePreview(
  employee,
  form,
  payrollConfiguration = DEFAULT_PAYROLL_CONFIGURATION,
) {
  const basicSalary = Number(
    employee?.basicSalary || 0,
  )

  const transportAllowance = Number(
    employee?.transportAllowance || 0,
  )

  const housingAllowance = Number(
    employee?.housingAllowance || 0,
  )

  const mealAllowance = Number(
    employee?.mealAllowance || 0,
  )

  const otherAllowance = Number(
    employee?.otherAllowance || 0,
  )

  const overtimeHours = Number(
    form?.overtimeHours || 0,
  )

  const overtimePay =
    calculateOvertimePay(
      basicSalary,
      overtimeHours,
      payrollConfiguration,
    )

  const loanDeduction = Number(
    form?.loanDeduction || 0,
  )

  const otherDeduction = Number(
    form?.otherDeduction || 0,
  )

  const grossSalary =
    basicSalary +
    transportAllowance +
    housingAllowance +
    mealAllowance +
    otherAllowance +
    overtimePay

  const excluded =
    isExcludedFromStatutoryDeductions(
      employee,
    )

  const employeePensionRate =
    Number(
      payrollConfiguration
        ?.employeePensionRate ??
        DEFAULT_PAYROLL_CONFIGURATION.employeePensionRate,
    )

  const employerPensionRate =
    Number(
      payrollConfiguration
        ?.employerPensionRate ??
        DEFAULT_PAYROLL_CONFIGURATION.employerPensionRate,
    )

  const taxablePercentOfAllowances =
    Number(
      payrollConfiguration
        ?.taxablePercentOfAllowances ??
        DEFAULT_PAYROLL_CONFIGURATION.taxablePercentOfAllowances,
    )

  const pensionDeduction = excluded
    ? 0
    : basicSalary *
      employeePensionRate

  const totalAllowances =
    transportAllowance +
    housingAllowance +
    mealAllowance +
    otherAllowance

  const taxableAllowances =
    totalAllowances *
    taxablePercentOfAllowances

  const taxableIncome = Math.max(
    0,
    basicSalary +
      taxableAllowances +
      overtimePay -
      pensionDeduction,
  )

  const incomeTax = excluded
    ? 0
    : calculateIncomeTax(
        taxableIncome,
      )

  const totalDeductions =
    pensionDeduction +
    incomeTax +
    loanDeduction +
    otherDeduction

  const netSalary =
    grossSalary - totalDeductions

  const employerPension = excluded
    ? 0
    : basicSalary *
      employerPensionRate

  const employerCost =
    grossSalary + employerPension

  return {
    basicSalary,
    transportAllowance,
    housingAllowance,
    mealAllowance,
    otherAllowance,
    overtimeHours,
    overtimePay,
    grossSalary,
    pensionDeduction,
    incomeTax,
    loanDeduction,
    otherDeduction,
    totalDeductions,
    netSalary,
    employerPension,
    employerCost,
  }
}

function getAttendanceSummary(
  attendance,
) {
  const summary = {
    workingDays: 0,
    presentDays: 0,
    absentDays: 0,
    leaveDays: 0,
    overtimeHours: 0,
    lateMinutes: 0,
  }

  if (!Array.isArray(attendance)) {
    return summary
  }

  attendance.forEach((item) => {
    const code = String(
      item.status ||
        item.attendanceStatus ||
        item.attendance_status ||
        item.code ||
        '',
    ).toUpperCase()

    if (
      code === 'WK' ||
      code === 'PH'
    ) {
      return
    }

    summary.workingDays += 1

    if (code === 'P') {
      summary.presentDays += 1
    }

    if (code === 'A') {
      summary.absentDays += 1
    }

    if (
      ['SL', 'AL', 'ML', 'OL'].includes(
        code,
      )
    ) {
      summary.leaveDays += 1
    }

    summary.overtimeHours += Number(
      item.overtime ??
        item.overtimeHours ??
        item.overtime_hours ??
        0,
    )

    summary.lateMinutes += Number(
      item.late ??
        item.lateMinutes ??
        item.late_minutes ??
        0,
    )
  })

  return summary
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  min,
  step,
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>

      <input
        type={type}
        value={value}
        min={min}
        step={step}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      />
    </label>
  )
}

function SectionTitle({ children }) {
  return (
    <div className="mb-3 border-b border-slate-200 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
      {children}
    </div>
  )
}

const RULE_TILE_ACCENTS = {
  sky: 'from-sky-500 to-sky-600 shadow-sky-500/20 ring-sky-100',
  teal: 'from-teal-500 to-teal-600 shadow-teal-500/20 ring-teal-100',
}

// One of the four "Payroll Rules" figures. The value is passed in as a node so
// the unit (% or ×) can be tinted separately from the number.
function RuleTile({ icon: Icon, label, value, accent = 'sky' }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.03] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white shadow-sm ring-1 ring-inset ${RULE_TILE_ACCENTS[accent]}`}
        >
          <Icon size={15} strokeWidth={2.3} />
        </span>

        <p className="min-w-0 text-[10px] font-bold uppercase leading-relaxed tracking-wider text-slate-400">
          {label}
        </p>
      </div>

      <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  )
}

function PayrollModal({
  employee,
  payroll,
  month,
  attendanceSummary,
  payrollConfiguration,
  onClose,
  onSaved,
}) {
  const automaticOvertimeHours =
    Number(
      attendanceSummary?.overtimeHours ||
        0,
    )

  const automaticOvertimePay =
    calculateOvertimePay(
      employee?.basicSalary,
      automaticOvertimeHours,
      payrollConfiguration,
    )

  const [form, setForm] = useState({
    ...emptyPayrollForm,

    payrollMonth:
      payroll?.payrollMonth ||
      month ||
      getCurrentMonth(),

    overtimeHours:
      automaticOvertimeHours,

    overtimePay:
      automaticOvertimePay,

    loanDeduction:
      payroll?.loanDeduction ?? 0,

    otherDeduction:
      payroll?.otherDeduction ?? 0,
  })

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  const preview = useMemo(
    () =>
      calculatePreview(
        employee,
        form,
        payrollConfiguration,
      ),
    [
      employee,
      form,
      payrollConfiguration,
    ],
  )

  function updateField(
    field,
    value,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!employee) {
      setError(
        'Employee information is missing.',
      )
      return
    }

    if (!form.payrollMonth) {
      setError(
        'Payroll month is required.',
      )
      return
    }

    try {
      setSaving(true)
      setError('')

      /*
       * Overtime is always taken from Attendance.
       * The value saved here is recalculated from
       * the current HR Settings configuration.
       */
      const overtimeHours =
        Number(
          attendanceSummary?.overtimeHours ||
            0,
        )

      const overtimePay =
        calculateOvertimePay(
          employee.basicSalary,
          overtimeHours,
          payrollConfiguration,
        )

      const payload = {
        employeeId:
          getEmployeeId(employee),

        payrollMonth:
          form.payrollMonth,

        overtimePay,

        loanDeduction: Number(
          form.loanDeduction || 0,
        ),

        otherDeduction: Number(
          form.otherDeduction || 0,
        ),
      }

      const isEditing =
        Boolean(payroll?.id)

      const response =
        await fetch(
          isEditing
            ? `${API_BASE}/payroll/${payroll.id}`
            : `${API_BASE}/payroll`,
          {
            method: isEditing
              ? 'PUT'
              : 'POST',

            headers: authHeaders({
              'Content-Type':
                'application/json',
            }),

            body: JSON.stringify(
              payload,
            ),
          },
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            'Unable to save payroll record.',
        )
      }

      onSaved(
        normalizePayroll(data),
      )
    } catch (err) {
      console.error(
        'Save payroll error:',
        err,
      )

      setError(
        err.message ||
          'Unable to save payroll record.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {payroll
                ? 'Edit Payroll'
                : 'Generate Payroll'}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {getEmployeeName(
                employee,
              )}
              {' · '}
              {employee?.department ||
                '-'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 p-6"
        >
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <SectionTitle>
              Payroll Period
            </SectionTitle>

            <div className="grid gap-4 md:grid-cols-3">
              <Field
                label="Payroll Month"
                type="month"
                value={
                  form.payrollMonth
                }
                onChange={(value) =>
                  updateField(
                    'payrollMonth',
                    value,
                  )
                }
              />

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">
                  Attendance Days
                </div>

                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {
                    attendanceSummary.workingDays
                  }
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Working days
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">
                  Present / Leave
                </div>

                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {
                    attendanceSummary.presentDays
                  }
                  {' / '}
                  {
                    attendanceSummary.leaveDays
                  }
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Present / Leave days
                </div>
              </div>
            </div>
          </div>

          <div>
            <SectionTitle>
              Additional Payroll Inputs
            </SectionTitle>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-medium text-slate-500">
                  Overtime Hours (Attendance)
                </div>

                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {automaticOvertimeHours.toFixed(
                    2,
                  )}{' '}
                  hrs
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Pulled automatically from Attendance.
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-medium text-slate-500">
                  Overtime Pay (Auto)
                </div>

                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {formatCurrency(
                    automaticOvertimePay,
                  )}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Hours ÷{' '}
                  {Number(
                    payrollConfiguration.standardMonthlyWorkingHours,
                  )}{' '}
                  ×{' '}
                  {Number(
                    payrollConfiguration.overtimeRateMultiplier,
                  )}
                </div>
              </div>

              <Field
                label="Loan / Advance Deduction"
                type="number"
                min="0"
                step="0.01"
                value={
                  form.loanDeduction
                }
                onChange={(value) =>
                  updateField(
                    'loanDeduction',
                    value,
                  )
                }
              />

              <Field
                label="Other Deduction"
                type="number"
                min="0"
                step="0.01"
                value={
                  form.otherDeduction
                }
                onChange={(value) =>
                  updateField(
                    'otherDeduction',
                    value,
                  )
                }
              />
            </div>
          </div>

          <div>
            <SectionTitle>
              Salary Calculation
            </SectionTitle>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs text-slate-500">
                  Basic Salary
                </div>

                <div className="mt-1 font-bold text-slate-900">
                  {formatCurrency(
                    preview.basicSalary,
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs text-slate-500">
                  Allowances
                </div>

                <div className="mt-1 font-bold text-slate-900">
                  {formatCurrency(
                    preview.transportAllowance +
                      preview.housingAllowance +
                      preview.mealAllowance +
                      preview.otherAllowance,
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs text-slate-500">
                  Gross Salary
                </div>

                <div className="mt-1 font-bold text-slate-900">
                  {formatCurrency(
                    preview.grossSalary,
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-slate-900 p-4 text-white">
                <div className="text-xs text-slate-300">
                  Net Salary
                </div>

                <div className="mt-1 font-bold">
                  {formatCurrency(
                    preview.netSalary,
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <SectionTitle>
              Deductions
            </SectionTitle>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500">
                  Pension{' '}
                  {Number(
                    payrollConfiguration.employeePensionRate *
                      100,
                  ).toFixed(2)}
                  %
                </div>

                <div className="mt-1 font-semibold text-slate-900">
                  {formatCurrency(
                    preview.pensionDeduction,
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500">
                  Income Tax
                </div>

                <div className="mt-1 font-semibold text-slate-900">
                  {formatCurrency(
                    preview.incomeTax,
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500">
                  Loan / Advance
                </div>

                <div className="mt-1 font-semibold text-slate-900">
                  {formatCurrency(
                    preview.loanDeduction,
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500">
                  Other
                </div>

                <div className="mt-1 font-semibold text-slate-900">
                  {formatCurrency(
                    preview.otherDeduction,
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
              <span>
                Employee Pension:{' '}
                {Number(
                  payrollConfiguration.employeePensionRate *
                    100,
                ).toFixed(2)}
                %
              </span>

              <span>
                Employer Pension:{' '}
                {Number(
                  payrollConfiguration.employerPensionRate *
                    100,
                ).toFixed(2)}
                %
              </span>

              <span>
                OT:{' '}
                {Number(
                  payrollConfiguration.overtimeRateMultiplier,
                )}
                ×
              </span>

              <span>
                Monthly Hours:{' '}
                {Number(
                  payrollConfiguration.standardMonthlyWorkingHours,
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <Save size={17} />
              )}

              {saving
                ? 'Saving...'
                : payroll
                  ? 'Save Changes'
                  : 'Generate Payroll'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Payroll() {
  const { can } = useAccess()
  const canCreate = can('payroll.create')
  const canEditPayroll = can('payroll.edit')
  const canDeletePayroll = can('payroll.delete')

  const [payrollMonth, setPayrollMonth] =
    useState(getCurrentMonth)

  const [employees, setEmployees] =
    useState([])

  const [attendance, setAttendance] =
    useState([])

  const [payroll, setPayroll] =
    useState([])

  const [
    payrollConfiguration,
    setPayrollConfiguration,
  ] = useState(
    DEFAULT_PAYROLL_CONFIGURATION,
  )

  const [loading, setLoading] =
    useState(true)

  const [
    payrollLoading,
    setPayrollLoading,
  ] = useState(false)

  const [error, setError] =
    useState('')

  const [
    payrollError,
    setPayrollError,
  ] = useState('')

  // Confirms a completed action, such as the total-as-image download. Without
  // it the button appears to do nothing: the only other feedback is the
  // browser's download shelf, which most people do not look at.
  const [notice, setNotice] =
    useState('')

  const [modalOpen, setModalOpen] =
    useState(false)

  const [
    selectedEmployee,
    setSelectedEmployee,
  ] = useState(null)

  const [
    selectedPayroll,
    setSelectedPayroll,
  ] = useState(null)

  const [generating, setGenerating] =
    useState(false)

  const [
    deletingId,
    setDeletingId,
  ] = useState(null)
  const [actionMenuId, setActionMenuId] = useState(null)
  const [deleteCandidate, setDeleteCandidate] = useState(null)
  const [savingTotalImage, setSavingTotalImage] = useState(false)
  const [companyInfo, setCompanyInfo] = useState(null)

  async function loadEmployees() {
    try {
      setLoading(true)
      setError('')

      const response =
        await fetch(
          `${API_BASE}/employees`,
          { headers: authHeaders() },
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            'Failed to load employees.',
        )
      }

      const normalized =
        Array.isArray(data)
          ? data.map(
              normalizeEmployee,
            )
          : []

      setEmployees(normalized)
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

  async function loadPayrollSettings() {
    try {
      const response =
        await fetch(
          `${API_BASE}/settings`,
          {
            cache: 'no-store',
            headers: authHeaders(),
          },
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            'Failed to load HR payroll settings.',
        )
      }

      setCompanyInfo(data?.companyInformation || null)
      setPayrollConfiguration({
        ...DEFAULT_PAYROLL_CONFIGURATION,
        ...(data?.payrollConfiguration ||
          {}),
      })
    } catch (err) {
      console.error(
        'Load payroll settings error:',
        err,
      )

      /*
       * Workbook defaults remain active
       * if the settings endpoint cannot
       * be reached.
       */
      setPayrollConfiguration(
        DEFAULT_PAYROLL_CONFIGURATION,
      )
    }
  }

  async function loadAttendance() {
    if (!payrollMonth) {
      return
    }

    const {
      start,
      end,
    } = getMonthRange(
      payrollMonth,
    )

    try {
      const response =
        await fetch(
          `${API_BASE}/attendance?startDate=${start}&endDate=${end}`,
          { headers: authHeaders() },
        )

      if (!response.ok) {
        return
      }

      const data =
        await response.json()

      setAttendance(
        Array.isArray(data)
          ? data
          : [],
      )
    } catch (err) {
      console.error(
        'Load attendance error:',
        err,
      )

      setAttendance([])
    }
  }

  async function loadSavedPayroll() {
    if (!payrollMonth) {
      return
    }

    try {
      setPayrollLoading(true)
      setPayrollError('')
      setNotice('')

      const response =
        await fetch(
          `${API_BASE}/payroll?payrollMonth=${encodeURIComponent(
            payrollMonth,
          )}`,
          {
            cache: 'no-store',
            headers: authHeaders(),
          },
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            'Failed to load saved payroll.',
        )
      }

      const records =
        Array.isArray(data)
          ? data.map(
              normalizePayroll,
            )
          : []

      setPayroll(records)
    } catch (err) {
      console.error(
        'Load payroll error:',
        err,
      )

      setPayroll([])

      setPayrollError(
        err.message ||
          'Saved payroll records could not be loaded from the database.',
      )
    } finally {
      setPayrollLoading(false)
    }
  }

  useEffect(() => {
    loadEmployees()
    loadPayrollSettings()
  }, [])

  useEffect(() => {
    loadAttendance()
  }, [payrollMonth])

  useEffect(() => {
    loadSavedPayroll()
  }, [payrollMonth])

  const activeEmployees =
    useMemo(
      () =>
        employees.filter(
          (employee) => {
            const status =
              String(
                employee.status ||
                  '',
              ).toLowerCase()

            return (
              status === 'active' ||
              status === ''
            )
          },
        ),
      [employees],
    )

  const payrollByEmployee =
    useMemo(() => {
      const map = new Map()

      payroll.forEach(
        (record) => {
          map.set(
            String(
              record.employeeId,
            ),
            record,
          )
        },
      )

      return map
    }, [payroll])

  const attendanceByEmployee =
    useMemo(() => {
      const map = new Map()

      employees.forEach(
        (employee) => {
          const ids = [
            employee.id,
            employee.employeeId,
          ].filter(Boolean)

          const records =
            attendance.filter(
              (item) => {
                const attendanceEmployeeId =
                  item.employeeId ||
                  item.employee_id

                return ids.some(
                  (id) =>
                    String(
                      attendanceEmployeeId,
                    ) ===
                    String(id),
                )
              },
            )

          map.set(
            String(
              getEmployeeId(
                employee,
              ),
            ),
            records,
          )

          if (employee.id) {
            map.set(
              String(employee.id),
              records,
            )
          }

          if (
            employee.employeeId
          ) {
            map.set(
              String(
                employee.employeeId,
              ),
              records,
            )
          }
        },
      )

      return map
    }, [
      employees,
      attendance,
    ])

  const employeeById =
    useMemo(() => {
      const map = new Map()

      employees.forEach(
        (employee) => {
          map.set(
            String(
              getEmployeeId(
                employee,
              ),
            ),
            employee,
          )

          if (employee.id) {
            map.set(
              String(employee.id),
              employee,
            )
          }

          if (
            employee.employeeId
          ) {
            map.set(
              String(
                employee.employeeId,
              ),
              employee,
            )
          }
        },
      )

      return map
    }, [employees])

  const rows = useMemo(
    () =>
      payroll.map(
        (record) => {
          const employee =
            employeeById.get(
              String(
                record.employeeId,
              ),
            ) || null

          const attendanceForEmployee =
            attendanceByEmployee.get(
              String(
                record.employeeId,
              ),
            ) || []

          return {
            ...record,
            employee,
            attendanceSummary:
              getAttendanceSummary(
                attendanceForEmployee,
              ),
          }
        },
      ),
    [
      payroll,
      employeeById,
      attendanceByEmployee,
    ],
  )

  const summary = useMemo(() => {
    const totalGross =
      payroll.reduce(
        (sum, item) =>
          sum +
          Number(
            item.grossSalary || 0,
          ),
        0,
      )

    const totalDeductions =
      payroll.reduce(
        (sum, item) =>
          sum +
          Number(
            item.totalDeductions ||
              0,
          ),
        0,
      )

    const totalNet =
      payroll.reduce(
        (sum, item) =>
          sum +
          Number(
            item.netSalary || 0,
          ),
        0,
      )

    const totalEmployerCost =
      payroll.reduce(
        (sum, item) =>
          sum +
          Number(
            item.employerCost || 0,
          ),
        0,
      )

    return {
      employees: payroll.length,
      totalGross,
      totalDeductions,
      totalNet,
      totalEmployerCost,
    }
  }, [payroll])

  function openCreateModal(
    employee,
  ) {
    setSelectedEmployee(employee)
    setSelectedPayroll(null)
    setModalOpen(true)
  }

  function openEditModal(
    record,
  ) {
    const employee =
      employeeById.get(
        String(
          record.employeeId,
        ),
      ) || null

    if (!employee) {
      setPayrollError(
        'The employee linked to this payroll record could not be found.',
      )

      return
    }

    setSelectedEmployee(employee)
    setSelectedPayroll(record)
    setModalOpen(true)
  }

  function closeModal() {
    if (generating) {
      return
    }

    setModalOpen(false)
    setSelectedEmployee(null)
    setSelectedPayroll(null)
  }

  async function handleSaved(
    savedRecord,
  ) {
    setPayroll(
      (current) => {
        const exists =
          current.some(
            (item) =>
              item.id ===
              savedRecord.id,
          )

        if (exists) {
          return current.map(
            (item) =>
              item.id ===
              savedRecord.id
                ? savedRecord
                : item,
          )
        }

        return [
          ...current,
          savedRecord,
        ]
      },
    )

    setModalOpen(false)
    setSelectedEmployee(null)
    setSelectedPayroll(null)

    await loadSavedPayroll()
  }

  async function generateAllPayroll() {
    if (!payrollMonth) {
      setPayrollError(
        'Please select a payroll month.',
      )

      return
    }

    if (
      !activeEmployees.length
    ) {
      setPayrollError(
        'There are no active employees available for payroll.',
      )

      return
    }

    try {
      setGenerating(true)
      setPayrollError('')

      const employeesWithoutPayroll =
        activeEmployees.filter(
          (employee) =>
            !payrollByEmployee.has(
              String(
                getEmployeeId(
                  employee,
                ),
              ),
            ),
        )

      if (
        employeesWithoutPayroll.length ===
        0
      ) {
        await loadSavedPayroll()
        return
      }

      const results = []

      for (
        const employee of employeesWithoutPayroll
      ) {
        const employeeAttendance =
          attendanceByEmployee.get(
            String(
              getEmployeeId(
                employee,
              ),
            ),
          ) || []

        const attendanceSummary =
          getAttendanceSummary(
            employeeAttendance,
          )

        const overtimePay =
          calculateOvertimePay(
            employee.basicSalary,
            attendanceSummary.overtimeHours,
            payrollConfiguration,
          )

        const response =
          await fetch(
            `${API_BASE}/payroll`,
            {
              method: 'POST',

              headers: authHeaders({
                'Content-Type':
                  'application/json',
              }),

              body: JSON.stringify({
                employeeId:
                  getEmployeeId(
                    employee,
                  ),

                payrollMonth,

                overtimePay,

                loanDeduction: 0,

                otherDeduction: 0,
              }),
            },
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data?.error ||
              data?.message ||
              `Failed to generate payroll for ${getEmployeeName(
                employee,
              )}.`,
          )
        }

        results.push(
          normalizePayroll(data),
        )
      }

      setPayroll(
        (current) => [
          ...current,
          ...results,
        ],
      )

      await loadSavedPayroll()
    } catch (err) {
      console.error(
        'Generate payroll error:',
        err,
      )

      setPayrollError(
        err.message ||
          'Unable to generate payroll.',
      )
    } finally {
      setGenerating(false)
    }
  }

  async function handleDelete(
    record,
  ) {
    if (!deleteCandidate) {
      setDeleteCandidate(record)
      return
    }
    try {
      setDeletingId(record.id)
      setPayrollError('')

      const response =
        await fetch(
          `${API_BASE}/payroll/${record.id}`,
          {
            method: 'DELETE',
            headers: authHeaders(),
          },
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            'Failed to delete payroll record.',
        )
      }

      setPayroll(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              record.id,
          ),
      )

      await loadSavedPayroll()
      setDeleteCandidate(null)
    } catch (err) {
      console.error(
        'Delete payroll error:',
        err,
      )

      setPayrollError(
        err.message ||
          'Unable to delete payroll record.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  function moveMonth(offset) {
    const [
      year,
      month,
    ] = payrollMonth
      .split('-')
      .map(Number)

    const next = new Date(
      year,
      month - 1 + offset,
      1,
    )

    setPayrollMonth(
      `${next.getFullYear()}-${String(
        next.getMonth() + 1,
      ).padStart(2, '0')}`,
    )
  }

  async function importPayrollRecords(records) {
    let imported = 0
    for (const record of records) {
      if (!record.employeeId || !record.payrollMonth) continue
      const response = await fetch(`${API_BASE}/payroll`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(record),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(`${record.employeeId} ${record.payrollMonth}: ${result.message || 'Import failed.'}`)
      imported += 1
    }
    await loadSavedPayroll()
    return `Imported ${imported} payroll record(s). Existing employee/month records are unchanged.`
  }

  async function handleExportTotalImage() {
    if (!payroll.length) {
      setPayrollError('There are no payroll records for this month to export.')
      return
    }

    setSavingTotalImage(true)
    try {
      const { filename } = await exportPayrollRecordsImage({
        month: payrollMonth,
        records: rows,
        companyName: companyInfo?.companyName || HR_SETTINGS.company.name,
        currency: companyInfo?.currency || HR_SETTINGS.company.currency,
      })
      setPayrollError('')
      setNotice(`Saved the payroll records for ${payrollMonth} as ${filename}.`)
    } catch (error) {
      setNotice('')
      setPayrollError(
        error.message || 'The payroll records could not be saved as an image.',
      )
    } finally {
      setSavingTotalImage(false)
    }
  }

  return (
    <div className="min-h-full bg-[#F3F4F6] text-slate-950">
      <main className="w-full max-w-[1600px] px-5 py-6 sm:px-8">
        <PageTitle
          eyebrow="Payroll Management"
          title="Manage Employee Payroll"
          description="Manage monthly salary calculations, deductions, net pay and employer cost."
          action={
            canCreate ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={generateAllPayroll}
                disabled={generating || payrollLoading || loading}
                icon={Calculator}
                loading={generating}
                loadingText="Generating..."
                size="lg"
              >
                Generate Payroll
              </Button>
            </div>
            ) : null
          }
          className="animate-employee-hero mb-8 px-0 py-2"
        />

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {payrollError && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {payrollError}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {notice}
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { title: 'Payroll Employees', description: 'Employees with payroll records', value: summary.employees, icon: Users, iconVariant: 'blue', valueLabel: 'Employees' },
            { title: 'Gross Payroll', description: 'Total gross payroll', value: formatCurrency(summary.totalGross), icon: Wallet, iconVariant: 'green', valueLabel: 'Amount' },
            { title: 'Total Deductions', description: 'Total payroll deductions', value: formatCurrency(summary.totalDeductions), icon: MinusCircle, iconVariant: 'orange', valueLabel: 'Amount' },
            { title: 'Net Payroll', description: 'Total net payroll', value: formatCurrency(summary.totalNet), icon: Banknote, iconVariant: 'violet', valueLabel: 'Amount' },
            { title: 'Employer Cost', description: 'Total employer cost', value: formatCurrency(summary.totalEmployerCost), icon: Building2, iconVariant: 'slate', valueLabel: 'Amount' },
          ].map((stat, statIndex) => (
            <SummaryCard
              key={stat.title}
              {...stat}
              animationDelay={statIndex * 100}
            />
          ))}
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={() => moveMonth(-1)} className="rounded-lg border border-slate-300 bg-white p-2.5 text-slate-600 hover:bg-slate-50" title="Previous month"><ChevronLeft size={18} /></button>
          <input type="month" value={payrollMonth} onChange={(event) => setPayrollMonth(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-slate-500" aria-label="Payroll month" />
          <button type="button" onClick={() => moveMonth(1)} className="rounded-lg border border-slate-300 bg-white p-2.5 text-slate-600 hover:bg-slate-50" title="Next month"><ChevronRight size={18} /></button>
        </div>

        <section>
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Payroll Records
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Saved payroll records for{' '}
                <span className="font-medium text-slate-700">
                  {payrollMonth}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
            <TableDataTools filename={`payroll-${payrollMonth}`} rows={payroll} onImport={importPayrollRecords} />
            <button
              type="button"
              onClick={handleExportTotalImage}
              disabled={savingTotalImage || !payroll.length}
              title={
                payroll.length
                  ? `Save the ${payroll.length} payroll records as a PNG image`
                  : 'There are no payroll records for this month to export'
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#0092B8] hover:bg-slate-50 hover:text-[#007A99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingTotalImage ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ImageIcon size={14} />
              )}
              {savingTotalImage
                ? 'Saving image...'
                : `Table as image${payroll.length ? ` (${payroll.length})` : ''}`}
            </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[1450px] text-left text-sm">
              <Table.Header className="bg-slate-50">
                <Table.Row className="bg-slate-50/90">
                  <Table.Head className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">#</Table.Head>
                  <Table.Head className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Employee
                  </Table.Head>

                  <Table.Head className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Department
                  </Table.Head>

                  <Table.Head className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Basic
                  </Table.Head>

                  <Table.Head className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Allowances
                  </Table.Head>

                  <Table.Head className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    OT Hours
                  </Table.Head>

                  <Table.Head className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Gross
                  </Table.Head>

                  <Table.Head className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Pension
                  </Table.Head>

                  <Table.Head className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Tax
                  </Table.Head>

                  <Table.Head className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Deductions
                  </Table.Head>

                  <Table.Head className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Net Salary
                  </Table.Head>

                  <Table.Head className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Employer Cost
                  </Table.Head>

                  <Table.Head className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Status
                  </Table.Head>

                  <Table.Head className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Actions
                  </Table.Head>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {loading ||
                payrollLoading ? (
                  <Table.Row>
                    <Table.Cell
                      colSpan={14}
                      className="px-6 py-12 text-center"
                    >
                      <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />

                        Loading payroll records...
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ) : rows.length ===
                  0 ? (
                  <Table.Row>
                    <Table.Cell
                      colSpan={14}
                      className="px-6 py-14 text-center"
                    >
                      <div className="mx-auto flex max-w-md flex-col items-center">
                        <CircleDollarSign
                          size={36}
                          className="text-slate-300"
                        />

                        <h3 className="mt-3 font-semibold text-slate-800">
                          No saved payroll records
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          Generate payroll for this
                          month to create the database
                          records.
                        </p>

                        {canCreate && (
                        <Button
                          type="button"
                          onClick={generateAllPayroll}
                          disabled={generating}
                          icon={Calculator}
                          loading={generating}
                          loadingText="Generating..."
                          className="mt-4"
                        >
                          Generate Payroll
                        </Button>
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  rows.map(
                    (row, index) => {
                      const employee =
                        row.employee

                      const attendanceSummary =
                        row.attendanceSummary ||
                        {}

                      const allowanceTotal =
                        Number(
                          row.transportAllowance ||
                            0,
                        ) +
                        Number(
                          row.housingAllowance ||
                            0,
                        ) +
                        Number(
                          row.mealAllowance ||
                            0,
                        ) +
                        Number(
                          row.otherAllowance ||
                            0,
                        )

                      return (
                      <Table.Row
                          key={row.id}
                          className="border-t border-slate-100 transition-colors hover:bg-slate-50/80"
                        >
                          <Table.Cell className="px-4 py-4 text-xs font-semibold text-slate-400">{index + 1}</Table.Cell>
                          <Table.Cell className="px-4 py-4">
                            <div className="font-medium text-slate-900">
                              {getEmployeeName(
                                employee,
                              )}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {employee?.employeeId ||
                                row.employeeId ||
                                '-'}
                            </div>
                          </Table.Cell>

                          <Table.Cell className="px-4 py-4 text-slate-600">
                            {employee?.department ||
                              '-'}
                          </Table.Cell>

                          <Table.Cell className="px-4 py-4 text-right font-medium text-slate-700">
                            {formatCurrency(
                              row.basicSalary,
                            )}
                          </Table.Cell>

                          <Table.Cell className="px-4 py-4 text-right text-slate-700">
                            {formatCurrency(
                              allowanceTotal,
                            )}
                          </Table.Cell>

                          <Table.Cell className="px-4 py-4 text-right text-slate-700">
                            <div className="inline-flex items-center gap-1">
                              <Clock3
                                size={14}
                                className="text-slate-400"
                              />

                              {Number(
                                attendanceSummary.overtimeHours ||
                                  0,
                              ).toFixed(
                                2,
                              )}
                            </div>
                          </Table.Cell>

                          <Table.Cell className="px-4 py-4 text-right font-semibold text-slate-900">
                            {formatCurrency(
                              row.grossSalary,
                            )}
                          </Table.Cell>

                          <Table.Cell className="px-4 py-4 text-right text-slate-700">
                            {formatCurrency(
                              row.pensionDeduction,
                            )}
                          </Table.Cell>

                          <Table.Cell className="px-4 py-4 text-right text-slate-700">
                            {formatCurrency(
                              row.incomeTax,
                            )}
                          </Table.Cell>

                          <Table.Cell className="px-4 py-4 text-right text-slate-700">
                            {formatCurrency(
                              row.totalDeductions,
                            )}
                          </Table.Cell>

                          <Table.Cell className="px-4 py-4 text-right font-bold text-slate-900">
                            {formatCurrency(
                              row.netSalary,
                            )}
                          </Table.Cell>

                          <Table.Cell className="px-4 py-4 text-right font-semibold text-slate-700">
                            {formatCurrency(
                              row.employerCost,
                            )}
                          </Table.Cell>

                          <Table.Cell className="px-4 py-4">
                            <span className="inline-flex text-xs font-semibold text-emerald-700">
                              Saved
                            </span>
                          </Table.Cell>

                          <Table.Cell className="px-4 py-4">
                            <TableRowMenu
                              open={actionMenuId === row.id}
                              onOpenChange={(open) => setActionMenuId(open ? row.id : null)}
                              triggerLabel={`Actions for payroll record ${row.employeeId || ''}`}
                            >
                              {canDeletePayroll && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuId(null)
                                    handleDelete(row)
                                  }}
                                  disabled={deletingId === row.id}
                                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                >
                                  {deletingId === row.id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={14} className="text-red-500" />
                                  )}
                                  <span>Delete payroll</span>
                                </button>
                              )}
                            </TableRowMenu>
                          </Table.Cell>
                        </Table.Row>
                      )
                    },
                  )
                )}
              </Table.Body>
            </Table>
          </div>
        </div>
        </section>

        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/[0.03]">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-sky-50/80 via-white to-teal-50/70 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span
                aria-hidden="true"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-sm shadow-sky-500/25"
              >
                <Calculator size={19} strokeWidth={2.2} />
              </span>

              <div className="min-w-0">
                <h2 className="text-lg font-bold tracking-tight text-slate-950">
                  Payroll Rules
                </h2>

                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  Current payroll calculations loaded from HR Settings.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-sky-100 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 shadow-sm ring-1 ring-inset ring-sky-100">
                Employee Pension:{' '}
                {Number(
                  payrollConfiguration.employeePensionRate *
                    100,
                ).toFixed(2)}
                %
              </span>

              <span className="rounded-full border border-teal-100 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 shadow-sm ring-1 ring-inset ring-teal-100">
                Employer Pension:{' '}
                {Number(
                  payrollConfiguration.employerPensionRate *
                    100,
                ).toFixed(2)}
                %
              </span>

              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-inset ring-slate-100">
                Contractual / Intern: Excluded
              </span>

              <span className="rounded-full border border-sky-100 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 shadow-sm ring-1 ring-inset ring-sky-100">
                Overtime: Hours ÷{' '}
                {Number(
                  payrollConfiguration.standardMonthlyWorkingHours,
                )}{' '}
                ×{' '}
                {Number(
                  payrollConfiguration.overtimeRateMultiplier,
                )}
              </span>
            </div>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
            <RuleTile
              icon={Clock3}
              label="Standard Monthly Hours"
              accent="sky"
              value={Number(
                payrollConfiguration.standardMonthlyWorkingHours,
              )}
            />

            <RuleTile
              icon={CircleDollarSign}
              label="Overtime Multiplier"
              accent="teal"
              value={
                <>
                  {Number(
                    payrollConfiguration.overtimeRateMultiplier,
                  )}
                  <span className="text-teal-500">×</span>
                </>
              }
            />

            <RuleTile
              icon={Users}
              label="Employee Pension"
              accent="sky"
              value={
                <>
                  {Number(
                    payrollConfiguration.employeePensionRate *
                      100,
                  ).toFixed(2)}
                  <span className="text-sky-500">%</span>
                </>
              }
            />

            <RuleTile
              icon={Building2}
              label="Employer Pension"
              accent="teal"
              value={
                <>
                  {Number(
                    payrollConfiguration.employerPensionRate *
                      100,
                  ).toFixed(2)}
                  <span className="text-teal-500">%</span>
                </>
              }
            />
          </div>

          <div className="px-5 pb-5">
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="overflow-x-auto">
                <Table className="w-full min-w-[700px] text-left text-sm">
                  <Table.Header className="bg-slate-50/90">
                    <Table.Row className="border-b border-slate-200">
                      <Table.Head className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Taxable Income
                      </Table.Head>

                      <Table.Head className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Rate
                      </Table.Head>

                      <Table.Head className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Subtraction
                      </Table.Head>
                    </Table.Row>
                  </Table.Header>

                  <Table.Body>
                    {PAYE_BRACKETS.map(
                      (
                        bracket,
                        index,
                      ) => (
                        <Table.Row
                          key={`${bracket.min}-${index}`}
                          className="border-b border-slate-100 transition-colors last:border-0 hover:bg-sky-50/40"
                        >
                          <Table.Cell className="px-4 py-3 font-medium text-slate-700">
                            {bracket.max ===
                            Infinity
                              ? `${formatCurrency(
                                  bracket.min,
                                )}+`
                              : `${formatCurrency(
                                  bracket.min,
                                )} – ${formatCurrency(
                                  bracket.max,
                                )}`}
                          </Table.Cell>

                          <Table.Cell className="px-4 py-3 text-right font-bold tabular-nums text-slate-950">
                            {bracket.rate *
                              100}
                            %
                          </Table.Cell>

                          <Table.Cell className="px-4 py-3 text-right tabular-nums text-slate-600">
                            {formatCurrency(
                              bracket.subtraction,
                            )}
                          </Table.Cell>
                        </Table.Row>
                      ),
                    )}
                  </Table.Body>
                </Table>
              </div>
            </div>
          </div>
        </section>

      </main>

      {modalOpen && (
        <PayrollModal
          employee={
            selectedEmployee
          }
          payroll={
            selectedPayroll
          }
          month={
            payrollMonth
          }
          payrollConfiguration={
            payrollConfiguration
          }
          attendanceSummary={getAttendanceSummary(
            selectedEmployee
              ? attendanceByEmployee.get(
                  String(
                    getEmployeeId(
                      selectedEmployee,
                    ),
                  ),
                ) || []
              : [],
          )}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
      {deleteCandidate && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4"><section role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-lg font-bold text-slate-900">Delete payroll record?</h2><p className="mt-2 text-sm text-slate-600">Delete the payroll record for {getEmployeeName(employeeById.get(String(deleteCandidate.employeeId)))} for {deleteCandidate.payrollMonth}? This action cannot be undone.</p><div className="mt-6 flex justify-end gap-3"><button type="button" disabled={Boolean(deletingId)} onClick={() => setDeleteCandidate(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button><button type="button" disabled={Boolean(deletingId)} onClick={() => handleDelete(deleteCandidate)} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{deletingId ? 'Deleting…' : 'Delete payroll'}</button></div></section></div>}
    </div>
  )
}
