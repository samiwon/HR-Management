import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Download,
  FileText,
  ShieldCheck,
  Users,
} from 'lucide-react'

import { Button, PageTitle, SummaryCard, Table } from '../../components/ui'

const API_URL = 'http://localhost:4000/api/hr-manager'

const EMPLOYMENT_TYPES = [
  'All Employment Types',
  'Permanent',
  'Contractual',
  'Intern',
]

const STATUSES = [
  'All Statuses',
  'Active',
  'On Leave',
  'Resigned',
]

function getEmployeeName(employee) {
  return employee.name || 'Unnamed Employee'
}

function getEmployeeId(employee) {
  return employee.employeeId || employee.id || 'N/A'
}

function getDepartment(employee) {
  return employee.department || 'Unassigned'
}

function getEmploymentType(employee) {
  return employee.employmentType || 'Permanent'
}

function getStatus(employee) {
  return employee.employmentStatus || 'Active'
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function getCurrentMonth() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function formatMonth(month) {
  if (!month) return ''
  return new Date(`${month}-01T00:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

// `icon` is opt-in. Without it the markup is exactly what it always was, so
// the other report sections are untouched.
function ReportSection({ title, description, children, plain = false, icon: Icon, action }) {
  return (
    <section className={plain ? 'p-0' : 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <span
              aria-hidden="true"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-sm shadow-sky-500/25"
            >
              <Icon size={19} strokeWidth={2.2} />
            </span>
          ) : null}

          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-slate-950">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>
          </div>
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  )
}

function csvDownload(filename, headers, rows) {
  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\n')

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename

  document.body.appendChild(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(url)
}

function HRReports() {
  const [month, setMonth] = useState(getCurrentMonth)
  const [department, setDepartment] = useState('All Departments')
  const [employmentType, setEmploymentType] = useState('All Employment Types')
  const [status, setStatus] = useState('All Statuses')

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadReports() {
      setLoading(true)
      setApiError('')

      try {
        const response = await fetch(
          `${API_URL}/reports?payrollMonth=${encodeURIComponent(month)}`,
        )

        const data = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(
            data?.message || 'Failed to load HR reports.',
          )
        }

        if (!cancelled) {
          setReport(data)
        }
      } catch (error) {
        if (!cancelled) {
          setApiError(
            error.message || 'Unable to load HR reports.',
          )
          setReport(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadReports()

    return () => {
      cancelled = true
    }
  }, [month])

  const employees = report?.employees || []
  const backendMetrics = report?.metrics || {}
  const backendDepartments = report?.departmentHeadcount || []
  const alerts = report?.alerts || {}
  const alertTotal = Number(report?.alertTotal || 0)

  const departments = useMemo(
    () => [
      'All Departments',
      ...Array.from(
        new Set(
          employees
            .map(getDepartment)
            .filter(Boolean),
        ),
      ),
    ],
    [employees],
  )

  const filteredEmployees = useMemo(
    () =>
      employees.filter((employee) => {
        const departmentMatches =
          department === 'All Departments' ||
          getDepartment(employee) === department

        const employmentTypeMatches =
          employmentType === 'All Employment Types' ||
          getEmploymentType(employee) === employmentType

        const statusMatches =
          status === 'All Statuses' ||
          getStatus(employee) === status

        return (
          departmentMatches &&
          employmentTypeMatches &&
          statusMatches
        )
      }),
    [
      employees,
      department,
      employmentType,
      status,
    ],
  )

  const filteredRows = useMemo(() => {
    return filteredEmployees.map((employee) => ({
      ...employee,
      attendance: employee.attendance || {
        present: 0,
        absent: 0,
        leave: 0,
        overtimeHours: 0,
        lateMinutes: 0,
      },
      payroll: employee.payroll || null,
    }))
  }, [filteredEmployees])

  const stats = useMemo(() => {
    const total = filteredRows.length

    const active = filteredRows.filter(
      (employee) =>
        getStatus(employee) === 'Active',
    ).length

    const onLeave = filteredRows.filter(
      (employee) =>
        getStatus(employee) === 'On Leave',
    ).length

    const resigned = filteredRows.filter(
      (employee) =>
        getStatus(employee) === 'Resigned',
    ).length

    const basicSalary = filteredRows.reduce(
      (sum, employee) =>
        sum + Number(employee.basicSalary || 0),
      0,
    )

    const grossPayroll = filteredRows.reduce(
      (sum, employee) =>
        sum +
        Number(employee.payroll?.grossSalary || 0),
      0,
    )

    const netPayroll = filteredRows.reduce(
      (sum, employee) =>
        sum +
        Number(employee.payroll?.netSalary || 0),
      0,
    )

    const overtimePay = filteredRows.reduce(
      (sum, employee) =>
        sum +
        Number(employee.payroll?.overtimePay || 0),
      0,
    )

    const overtimeHours = filteredRows.reduce(
      (sum, employee) =>
        sum +
        Number(
          employee.attendance?.overtimeHours || 0,
        ),
      0,
    )

    const present = filteredRows.reduce(
      (sum, employee) =>
        sum +
        Number(employee.attendance?.present || 0),
      0,
    )

    const absent = filteredRows.reduce(
      (sum, employee) =>
        sum +
        Number(employee.attendance?.absent || 0),
      0,
    )

    const leave = filteredRows.reduce(
      (sum, employee) =>
        sum +
        Number(employee.attendance?.leave || 0),
      0,
    )

    const lateMinutes = filteredRows.reduce(
      (sum, employee) =>
        sum +
        Number(
          employee.attendance?.lateMinutes || 0,
        ),
      0,
    )

    return {
      total,
      active,
      onLeave,
      resigned,
      averageSalary:
        total > 0 ? basicSalary / total : 0,
      grossPayroll,
      netPayroll,
      overtimePay,
      overtimeHours,
      present,
      absent,
      leave,
      lateMinutes,
    }
  }, [filteredRows])

  const departmentReport = useMemo(() => {
    const counts = {}

    filteredRows.forEach((employee) => {
      const name = getDepartment(employee)
      counts[name] = (counts[name] || 0) + 1
    })

    return Object.entries(counts).sort(
      (a, b) => b[1] - a[1],
    )
  }, [filteredRows])

  const employmentTypeReport = useMemo(() => {
    const counts = {}

    filteredRows.forEach((employee) => {
      const type = getEmploymentType(employee)
      counts[type] = (counts[type] || 0) + 1
    })

    return Object.entries(counts).sort(
      (a, b) => b[1] - a[1],
    )
  }, [filteredRows])

  const salaryReport = useMemo(
    () =>
      [...filteredRows]
        .sort(
          (a, b) =>
            Number(b.basicSalary || 0) -
            Number(a.basicSalary || 0),
        )
        .slice(0, 10),
    [filteredRows],
  )

  function handleExport() {
    const rows = filteredRows.map(
      (employee) => [
        getEmployeeId(employee),
        getEmployeeName(employee),
        getDepartment(employee),
        getEmploymentType(employee),
        getStatus(employee),
        Number(
          employee.basicSalary || 0,
        ).toFixed(2),
        Number(
          employee.payroll?.grossSalary || 0,
        ).toFixed(2),
        Number(
          employee.attendance?.overtimeHours || 0,
        ).toFixed(2),
        Number(
          employee.payroll?.overtimePay || 0,
        ).toFixed(2),
        Number(
          employee.payroll?.netSalary || 0,
        ).toFixed(2),
      ],
    )

    csvDownload(
      `yanol-tech-hr-report-${month}.csv`,
      [
        'Employee ID',
        'Employee Name',
        'Department',
        'Employment Type',
        'Status',
        'Basic Salary',
        'Gross Payroll',
        'Overtime Hours',
        'Overtime Pay',
        'Net Salary',
      ],
      rows,
    )
  }

  return (
    <div className="min-h-full bg-[#F3F4F6] text-slate-950">
      <main className="w-full max-w-[1600px] px-5 py-6 sm:px-8">
        <PageTitle
          eyebrow="Workforce Analytics"
          title="HR Reports"
          description="Database-backed workforce statistics, department distributions, and monthly payroll reports."
          action={
            <Button
              type="button"
              onClick={handleExport}
              icon={Download}
            >
              Export CSV
            </Button>
          }
          className="animate-employee-hero mb-8 px-0 py-2"
        />

        <div className="mb-6">
          <div className="grid gap-4 md:grid-cols-4">
            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Payroll Month
              </span>

              <input
                type="month"
                value={month}
                onChange={(event) =>
                  setMonth(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Department
              </span>

              <select
                value={department}
                onChange={(event) =>
                  setDepartment(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              >
                {departments.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Employment Type
              </span>

              <select
                value={employmentType}
                onChange={(event) =>
                  setEmploymentType(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              >
                {EMPLOYMENT_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Employment Status
              </span>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              >
                {STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {apiError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {apiError}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
            Loading live HR reports...
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                icon={Users}
                title="Employees"
                value={stats.total}
                description="Matching employees"
                iconVariant="blue"
                valueLabel="Employees"
              />

              <SummaryCard
                icon={BriefcaseBusiness}
                title="Active Employees"
                value={stats.active}
                description="Currently active"
                iconVariant="green"
                valueLabel="Employees"
              />

              <SummaryCard
                icon={Building2}
                title="Departments"
                value={departmentReport.length}
                description="Departments represented"
                iconVariant="violet"
                valueLabel="Departments"
              />

              <SummaryCard
                icon={FileText}
                title="Average Salary"
                value={formatCurrency(stats.averageSalary)}
                description="Average basic salary"
                iconVariant="orange"
                valueLabel="Amount"
              />
            </div>

            <ReportSection
              title={`Payroll Summary — ${formatMonth(month)}`}
              description="Payroll values are supplied by the HR Reports backend and originate from database payroll records."
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    Gross Payroll
                  </p>

                  <p className="mt-2 text-xl font-bold text-slate-950">
                    {formatCurrency(
                      stats.grossPayroll,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Backend total:{' '}
                    {formatCurrency(
                      backendMetrics.totalMonthlyGrossPayroll,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    Net Payroll
                  </p>

                  <p className="mt-2 text-xl font-bold text-slate-950">
                    {formatCurrency(
                      stats.netPayroll,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Backend total:{' '}
                    {formatCurrency(
                      backendMetrics.totalNetPayroll,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    Income Tax
                  </p>

                  <p className="mt-2 text-xl font-bold text-slate-950">
                    {formatCurrency(
                      backendMetrics.totalIncomeTax,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    Employee Pension
                  </p>

                  <p className="mt-2 text-xl font-bold text-slate-950">
                    {formatCurrency(
                      backendMetrics.totalEmployeePension,
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 p-4">
                  <p className="text-sm text-slate-500">
                    Overtime Hours
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-950">
                    {stats.overtimeHours.toFixed(2)}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Backend total:{' '}
                    {Number(
                      backendMetrics.totalOvertimeHours || 0,
                    ).toFixed(2)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 p-4">
                  <p className="text-sm text-slate-500">
                    Overtime Pay
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-950">
                    {formatCurrency(
                      stats.overtimePay,
                    )}
                  </p>
                </div>
              </div>
            </ReportSection>

            <ReportSection
              title="Attendance Summary"
              description={`Attendance data supplied by the consolidated HR Reports API for ${formatMonth(month)}.`}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  ['Present', stats.present],
                  ['Absent', stats.absent],
                  ['Leave', stats.leave],
                  ['Late Hours', `${(Number(stats.lateMinutes || 0) / 60).toFixed(2)} h`],
                  [
                    'OT Hours',
                    stats.overtimeHours.toFixed(2),
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-slate-100 p-4"
                  >
                    <p className="text-sm text-slate-500">
                      {label}
                    </p>

                    <p className="mt-2 text-2xl font-bold text-slate-950">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </ReportSection>

            <ReportSection
              title="Employment Status Summary"
              description="Current employee status distribution from the employee database."
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    Active
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {stats.active}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    On Leave
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {stats.onLeave}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    Resigned
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {stats.resigned}
                  </p>
                </div>
              </div>
            </ReportSection>

            <div className="grid gap-6 lg:grid-cols-2">
              <ReportSection
                title="Employees by Department"
                description="Filtered employee distribution. Backend headcount is also available from the reporting API."
              >
                {departmentReport.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                    No matching employees.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {departmentReport.map(
                      ([name, count]) => {
                        const percentage =
                          stats.total > 0
                            ? (count / stats.total) *
                              100
                            : 0

                        return (
                          <div key={name}>
                            <div className="mb-2 flex justify-between">
                              <span className="text-sm font-medium text-slate-700">
                                {name}
                              </span>

                              <span className="text-sm font-semibold">
                                {count}
                              </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-slate-800"
                                style={{
                                  width: `${percentage}%`,
                                }}
                              />
                            </div>
                          </div>
                        )
                      },
                    )}
                  </div>
                )}

                {backendDepartments.length > 0 && (
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Backend Active Headcount
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {backendDepartments.map(
                        (item) => (
                          <span
                            key={item.department}
                            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
                          >
                            {item.department}: {item.count}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </ReportSection>

              <ReportSection
                title="Employment Type"
                description="Employees grouped by employment arrangement."
              >
                <div className="space-y-3">
                  {employmentTypeReport.map(
                    ([type, count]) => (
                      <div
                        key={type}
                        className="flex items-center justify-between rounded-xl border border-slate-100 p-4"
                      >
                        <span className="font-medium text-slate-800">
                          {type}
                        </span>

                        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold">
                          {count}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </ReportSection>
            </div>

            <ReportSection
              title="Data Quality & Validation"
              description="Validation checks generated by the HR Reports backend based on the workbook reporting requirements."
              icon={ShieldCheck}
              action={
                <span
                  className={
                    alertTotal === 0
                      ? 'inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700'
                      : 'inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800'
                  }
                >
                  {alertTotal === 0 ? (
                    <CheckCircle2 size={13} strokeWidth={2.4} />
                  ) : (
                    <AlertTriangle size={13} strokeWidth={2.4} />
                  )}
                  {alertTotal === 0
                    ? 'All checks passed'
                    : `${alertTotal} flagged`}
                </span>
              }
            >
              {alertTotal === 0 ? (
                <div className="flex items-center gap-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-5">
                  <span
                    aria-hidden="true"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-200/70"
                  >
                    <FileText size={20} strokeWidth={2.1} />
                  </span>

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-emerald-900">
                      No validation alerts
                    </p>

                    <p className="mt-1 text-sm leading-relaxed text-emerald-700/90">
                      The current reporting checks did not find any flagged records.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(alerts)
                    .filter(
                      ([, value]) =>
                        Number(value || 0) > 0,
                    )
                    .map(([key, value]) => (
                      <div
                        key={key}
                        className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.03] transition duration-200 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
                      >
                        {/* A single amber edge carries the warning signal, so
                            the number itself can stay in the page's own
                            typography instead of shouting in orange. */}
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-400 to-orange-400"
                        />

                        <div className="flex items-start justify-between gap-3 pl-2.5">
                          <p
                            className="min-w-0 flex-1 text-xs font-semibold leading-relaxed text-slate-600"
                            title={key}
                          >
                            {key}
                          </p>

                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100">
                            <AlertTriangle size={15} strokeWidth={2.3} />
                          </span>
                        </div>

                        <p className="mt-3 pl-2.5 text-3xl font-bold tabular-nums tracking-tight text-slate-950">
                          {value}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </ReportSection>

            <ReportSection
              title="Salary & Payroll Overview"
              description="Top basic salaries with payroll values supplied by the consolidated reports API."
            >
              <div className="mb-3 flex justify-end">
                <Button
                  type="button"
                  onClick={handleExport}
                  disabled={loading || filteredRows.length === 0}
                  icon={Download}
                  variant="outline"
                  className="text-slate-400 hover:text-slate-600"
                >
                  Export Report
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table className="w-full min-w-[950px] text-left">
                  <thead>
                    <tr className="border-b border-slate-200">
                      {[
                        '#',
                        'Employee',
                        'Department',
                        'Status',
                        'Basic Salary',
                        'OT Hours',
                        'Gross',
                        'Net',
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {salaryReport.map(
                      (employee, index) => {
                        const id =
                          getEmployeeId(employee)

                        return (
                          <tr
                            key={id}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="px-3 py-4 text-xs font-semibold text-slate-400">{index + 1}</td>
                            <td className="px-3 py-4">
                              <p className="text-sm font-semibold text-slate-900">
                                {getEmployeeName(
                                  employee,
                                )}
                              </p>

                              <p className="text-xs text-slate-400">
                                {id}
                              </p>
                            </td>

                            <td className="px-3 py-4 text-sm text-slate-600">
                              {getDepartment(
                                employee,
                              )}
                            </td>

                            <td className="px-3 py-4 text-sm text-slate-600">
                              {getStatus(
                                employee,
                              )}
                            </td>

                            <td className="px-3 py-4 text-sm font-semibold">
                              {formatCurrency(
                                employee.basicSalary,
                              )}
                            </td>

                            <td className="px-3 py-4 text-sm font-semibold">
                              {Number(
                                employee
                                  .attendance
                                  ?.overtimeHours ||
                                  0,
                              ).toFixed(2)}
                            </td>

                            <td className="px-3 py-4 text-sm font-semibold">
                              {formatCurrency(
                                employee.payroll
                                  ?.grossSalary ||
                                  0,
                              )}
                            </td>

                            <td className="px-3 py-4 text-sm font-bold text-emerald-700">
                              {formatCurrency(
                                employee.payroll
                                  ?.netSalary ||
                                  0,
                              )}
                            </td>
                          </tr>
                        )
                      },
                    )}

                    {salaryReport.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 py-8 text-center text-sm text-slate-500"
                        >
                          No employees match the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </ReportSection>

          </>
        )}
      </main>
    </div>
  )
}

export default HRReports
