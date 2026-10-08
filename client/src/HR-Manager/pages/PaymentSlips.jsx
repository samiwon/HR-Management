import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Banknote,
  Building2,
  CalendarDays,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Printer,
  Search,
  Users,
  X,
} from 'lucide-react'

import { PageTitle, Table } from '../../components/ui'
import { authHeaders, describeAuthFailure } from '../../lib/hrApi'
import {
  ALL_DEPARTMENTS,
  ALL_PERIODS,
  exportCsv,
  exportWorkbook,
  filterSlips,
  formatPeriod,
  printAllSlips,
  resolveExportSet,
  summarise,
} from '../lib/payslips-export'

const API_URL = '/api/hr-manager'

/** The scope value that means "every employee", not one. */
const ALL_EMPLOYEES = '*'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function getEmployeeName(employee = {}) {
  return employee.name || [employee.firstName, employee.lastName].filter(Boolean).join(' ') || 'Employee'
}

function responseRows(data, keys = []) {
  if (Array.isArray(data)) return data
  for (const key of keys) if (Array.isArray(data?.[key])) return data[key]
  if (data?.data && data.data !== data) return responseRows(data.data, keys)
  return []
}

/**
 * Every request from this page carries the session token.
 *
 * The slips, the employee list and the attendance all sit behind
 * `requirePermission`, so an unauthenticated request is answered with a bare
 * 401 and the page renders an empty table with no explanation of why.
 */
async function getJson(path) {
  const response = await fetch(`${API_URL}${path}`, { headers: authHeaders(), cache: 'no-store' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const authMessage = describeAuthFailure(response, data)
    throw new Error(authMessage || data.message || `Could not load data (${response.status})`)
  }
  return data
}

function getPeriodRange(period) {
  if (!/^\d{4}-\d{2}$/.test(period || '')) return null
  const [year, month] = period.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  return {
    startDate: `${period}-01`,
    endDate: `${period}-${String(lastDay).padStart(2, '0')}`,
  }
}

function normalizePayroll(record, employee) {
  return {
    ...record,
    employeeDatabaseId: record.employeeId,
    employeeId: employee?.employeeId || record.employee?.employeeId || record.employeeId || '',
    employeeName: getEmployeeName(employee || record.employee || { name: record.employeeName }),
    department: employee?.department || record.employee?.department || record.department || 'Unassigned',
    jobTitle: employee?.jobTitle || employee?.position || record.employee?.jobTitle || record.jobTitle || 'Employee',
    employmentStatus: employee?.employmentStatus || employee?.status || record.employee?.employmentStatus || record.employmentStatus || '—',
    employmentType: employee?.employmentType || record.employee?.employmentType || record.employmentType || '—',
    email: employee?.email || record.employee?.email || '',
    phone: employee?.phone || record.employee?.phone || '',
    tin: employee?.tin || record.employee?.tin || '',
    pensionId: employee?.pensionId || record.employee?.pensionId || '',
    bankName: employee?.bankName || record.employee?.bankName || '',
    bankAccount: employee?.bankAccount || record.employee?.bankAccount || '',
    joinDate: employee?.joinDate || record.employee?.joinDate || '',
    overtimeHours: Number(record.overtimeHours ?? record.otHours ?? 0),
    basicSalary: Number(record.basicSalary || 0),
    transportAllowance: Number(record.transportAllowance || 0),
    housingAllowance: Number(record.housingAllowance || 0),
    mealAllowance: Number(record.mealAllowance || 0),
    otherAllowance: Number(record.otherAllowance || 0),
    overtimePay: Number(record.overtimePay || 0),
    grossSalary: Number(record.grossSalary || 0),
    pensionDeduction: Number(record.pensionDeduction || record.employeePension || 0),
    incomeTax: Number(record.incomeTax || 0),
    loanDeduction: Number(record.loanDeduction || record.loanAdvance || 0),
    otherDeduction: Number(record.otherDeduction || 0),
    totalDeductions: Number(record.totalDeductions || 0),
    netSalary: Number(record.netSalary || 0),
    employerPension: Number(record.employerPension || 0),
    employerCost: Number(record.employerCost || 0),
  }
}

function DetailRow({ label, value, currency = false, emphasis = false }) {
  return (
    <div className={`flex items-start justify-between gap-4 px-4 py-3 text-sm ${emphasis ? 'bg-slate-50 font-bold text-slate-950' : 'text-slate-600'}`}>
      <span>{label}</span>
      <span className="text-right font-semibold text-slate-900">{currency ? formatCurrency(value) : value || '—'}</span>
    </div>
  )
}

/** One figure in the totals strip above the table. */
function TotalCell({ label, value, tone = 'default' }) {
  const toneClass =
    tone === 'payable' ? 'text-emerald-700' : tone === 'deduction' ? 'text-rose-700' : 'text-slate-900'
  return (
    <div className="min-w-0 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums sm:text-xl ${toneClass}`}>{value}</p>
    </div>
  )
}

function PayslipPreview({ payslip, attendance, attendanceLoading, attendanceError, onClose }) {
  if (!payslip) return null
  const presentDays = attendance.filter((record) => ['PRESENT', 'LATE', 'CHECKED_IN', 'PENDING_CHECKOUT', 'PENDING_REVIEW'].includes(String(record.status || '').toUpperCase())).length
  const absentDays = attendance.filter((record) => ['ABSENT', 'A'].includes(String(record.status || '').toUpperCase())).length
  const leaveDays = attendance.filter((record) => ['SL', 'AL', 'ML', 'OL', 'LEAVE'].includes(String(record.status || '').toUpperCase())).length
  const lateMinutes = attendance.reduce((total, record) => total + Number(record.late || 0), 0)
  const overtimeHours = attendance.reduce((total, record) => total + Number(record.overtime || 0), 0)
  const earnings = [
    ['Basic Salary', payslip.basicSalary],
    ['Transport Allowance', payslip.transportAllowance],
    ['Housing Allowance', payslip.housingAllowance],
    ['Meal Allowance', payslip.mealAllowance],
    ['Other Allowance', payslip.otherAllowance],
    [`Overtime Pay${overtimeHours ? ` (${overtimeHours.toFixed(2)} hours)` : ''}`, payslip.overtimePay],
  ]
  const deductions = [
    ['Employee Pension', payslip.pensionDeduction],
    ['Income Tax', payslip.incomeTax],
    ['Loan Deduction', payslip.loanDeduction],
    ['Other Deduction', payslip.otherDeduction],
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-5 print:static print:block print:bg-white print:p-0">
      <section className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl print:max-h-none print:max-w-none print:overflow-visible print:rounded-none print:shadow-none">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 print:hidden">
          <div className="min-w-0"><h2 className="text-lg font-bold text-slate-950 sm:text-xl">Payment Slip</h2><p className="mt-1 truncate text-sm text-slate-500">{payslip.employeeName} · {formatPeriod(payslip.payrollMonth)}</p></div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 sm:px-4"><Printer size={16} /> <span className="hidden sm:inline">Print / Save</span></button>
            <button type="button" onClick={onClose} aria-label="Close payment slip" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={19} /></button>
          </div>
        </header>

        <div className="space-y-7 p-4 sm:p-8 print:p-10">
          <div className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-start">
            <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-white"><Building2 size={24} /></div><div><h1 className="text-2xl font-bold text-slate-950">Yanol Tech</h1><p className="text-sm text-slate-500">Employee Payment Slip</p></div></div>
            <div className="sm:text-right"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Payroll Period</p><p className="mt-1 text-lg font-bold text-slate-950">{formatPeriod(payslip.payrollMonth)}</p><p className="mt-1 text-xs text-slate-500">Record #{payslip.id}</p></div>
          </div>

          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Employee Information</h3>
            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-5">
              {[
                ['Employee Name', payslip.employeeName], ['Employee ID', payslip.employeeId], ['Department', payslip.department],
                ['Job Title', payslip.jobTitle], ['Employment Status', payslip.employmentStatus], ['Employment Type', payslip.employmentType], ['Payment Type', 'Monthly Payroll'],
                ['Email', payslip.email], ['Phone', payslip.phone], ['Join Date', payslip.joinDate],
                ['TIN', payslip.tin], ['Pension ID', payslip.pensionId], ['Bank', payslip.bankName], ['Bank Account', payslip.bankAccount],
              ].map(([label, value]) => <div key={label} className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-semibold text-slate-800">{value || '—'}</p></div>)}
            </div>
          </section>

          <div className="grid gap-5 md:grid-cols-2">
            <section><h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Earnings</h3><div className="overflow-hidden rounded-xl border border-slate-200 divide-y divide-slate-100">{earnings.map(([label, value]) => <DetailRow key={label} label={label} value={value} currency />)}<DetailRow label="Gross Salary" value={payslip.grossSalary} currency emphasis /></div></section>
            <section><h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Deductions</h3><div className="overflow-hidden rounded-xl border border-slate-200 divide-y divide-slate-100">{deductions.map(([label, value]) => <DetailRow key={label} label={label} value={value} currency />)}<DetailRow label="Total Deductions" value={payslip.totalDeductions} currency emphasis /></div></section>
          </div>

          <section className="rounded-2xl bg-slate-950 p-5 text-white sm:p-6"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="text-sm text-slate-300">Net Salary Payable</p><p className="mt-1 text-3xl font-bold sm:text-4xl">{formatCurrency(payslip.netSalary)}</p></div><Banknote className="h-10 w-10 text-slate-400" /></div></section>

          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Attendance Information</h3><p className="mt-1 text-xs text-slate-500">Attendance entries recorded for {formatPeriod(payslip.payrollMonth)}.</p></div>{!attendanceLoading && <span className="text-xs font-medium text-slate-500">{attendance.length} records</span>}</div>
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[['Present', presentDays], ['Absent', absentDays], ['Leave', leaveDays], ['Late', `${(lateMinutes / 60).toFixed(2)} hrs`], ['Overtime', `${overtimeHours.toFixed(2)} hrs`]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-slate-800">{value}</p></div>)}
            </div>
            {attendanceError && <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{attendanceError}</p>}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <Table className="min-w-[680px] w-full">
                <thead><tr className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500"><th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Check In</th><th className="px-3 py-2.5">Check Out</th><th className="px-3 py-2.5 text-right">Late</th><th className="px-3 py-2.5 text-right">Regular</th><th className="px-3 py-2.5 text-right">Overtime</th></tr></thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {attendanceLoading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500"><span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading attendance…</span></td></tr> : attendance.length ? attendance.map((record) => <tr key={record.id}><td className="whitespace-nowrap px-3 py-2.5">{record.date}</td><td className="px-3 py-2.5">{record.status || '—'}</td><td className="px-3 py-2.5">{record.checkIn || '—'}</td><td className="px-3 py-2.5">{record.checkOut || '—'}</td><td className="px-3 py-2.5 text-right">{(Number(record.late || 0) / 60).toFixed(2)} hrs</td><td className="px-3 py-2.5 text-right">{Number(record.regular || 0).toFixed(2)} hrs</td><td className="px-3 py-2.5 text-right">{Number(record.overtime || 0).toFixed(2)} hrs</td></tr>) : <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No attendance entries found for this pay period.</td></tr>}
                </tbody>
              </Table>
            </div>
          </section>

          <section className="grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-2"><DetailRow label="Employer Pension Contribution" value={payslip.employerPension} currency /><DetailRow label="Total Employer Cost" value={payslip.employerCost} currency /></section>
          <p className="border-t border-slate-100 pt-4 text-center text-[11px] text-slate-400">This slip is generated from the saved payroll record. Please contact Human Resources if you have questions.</p>
        </div>
      </section>
    </div>
  )
}

/**
 * The whole-run export.
 *
 * One action produces every slip in view as an Excel workbook, a CSV or a
 * printable set of pages. `count` is stated on the trigger, because a payroll
 * export is not the kind of thing somebody should fire off without knowing how
 * many payslips are about to leave the building.
 */
function ExportMenu({ count, onExport, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const run = (kind) => {
    setOpen(false)
    onExport(kind)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
      >
        <Download size={16} />
        <span className="truncate">Export {count} slip{count === 1 ? '' : 's'}</span>
        <ChevronDown size={15} className={`shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-xl">
          <p className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            {count} slip{count === 1 ? '' : 's'} in this export. The file is named after the pay period
            {count === 1 ? '' : 's'} it covers.
          </p>
          <button type="button" role="menuitem" onClick={() => run('workbook')} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50">
            <FileSpreadsheet size={18} className="mt-0.5 shrink-0 text-[#0092B8]" />
            <span>
              <span className="block text-sm font-bold text-slate-900">Excel workbook</span>
              <span className="mt-0.5 block text-xs text-slate-500">A summary, the full register, and a sheet per pay period.</span>
            </span>
          </button>
          <button type="button" role="menuitem" onClick={() => run('csv')} className="flex w-full items-start gap-3 border-t border-slate-100 px-4 py-3 text-left hover:bg-slate-50">
            <FileText size={18} className="mt-0.5 shrink-0 text-emerald-600" />
            <span>
              <span className="block text-sm font-bold text-slate-900">CSV file</span>
              <span className="mt-0.5 block text-xs text-slate-500">One flat table, for a bank upload or a pension portal.</span>
            </span>
          </button>
          <button type="button" role="menuitem" onClick={() => run('print')} className="flex w-full items-start gap-3 border-t border-slate-100 px-4 py-3 text-left hover:bg-slate-50">
            <Printer size={18} className="mt-0.5 shrink-0 text-slate-500" />
            <span>
              <span className="block text-sm font-bold text-slate-900">Print / save as PDF</span>
              <span className="mt-0.5 block text-xs text-slate-500">Every slip on its own page, with the run totals on the first.</span>
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

function PaymentSlips() {
  const [employees, setEmployees] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [employeeWarning, setEmployeeWarning] = useState('')
  const [scope, setScope] = useState(ALL_EMPLOYEES)
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState(ALL_DEPARTMENTS)
  const [periodFilter, setPeriodFilter] = useState(ALL_PERIODS)
  const [selected, setSelected] = useState(() => new Set())
  const [exportMessage, setExportMessage] = useState('')
  const [selectedPayslip, setSelectedPayslip] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [attendanceError, setAttendanceError] = useState('')
  const slipRequestId = useRef(0)

  // The whole payroll is fetched once, not one employee at a time. The filters
  // below then scope it, so "export everything" and "export one department"
  // are the same request rather than two different code paths.
  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setLoadError('')

      // The employee list only enriches the slips with bank details, job titles
      // and identifiers, so a refusal to read it costs detail rather than the
      // payroll itself. It is fetched alongside the records rather than first,
      // so a slow employee list never delays the numbers.
      const [payrollResult, employeesResult] = await Promise.allSettled([
        getJson('/payroll'),
        getJson('/employees'),
      ])

      if (!active) return

      if (payrollResult.status === 'rejected') {
        setLoadError(payrollResult.reason?.message || 'Unable to load payment slips.')
        setRecords([])
      } else {
        setRecords(responseRows(payrollResult.value, ['records', 'payroll', 'payrollRecords']))
      }

      if (employeesResult.status === 'fulfilled') {
        setEmployees(responseRows(employeesResult.value, ['employees']))
        setEmployeeWarning('')
      } else {
        // The payroll itself is still usable, so this is a warning rather than
        // an error. The reason is spelled out because a bare "you do not have
        // permission" next to a slip with no bank details reads like a bug in
        // the page rather than a missing permission on the account.
        setEmployees([])
        setEmployeeWarning(
          `${employeesResult.reason?.message || 'The employee list could not be loaded.'} ` +
            'Bank details, job titles and employee IDs on these slips come from the employee records, so they may be blank.',
        )
      }

      setLoading(false)
    }

    load()
    return () => { active = false }
  }, [])

  /**
   * Payroll rows point at the employee record by its database id, but a slip can
   * also carry the human-facing employee code. Both are indexed so either one
   * finds the person, which is what keeps a slip's bank details attached when
   * the two ids differ.
   */
  const employeeIndex = useMemo(() => {
    const index = new Map()
    for (const employee of employees) {
      for (const key of [employee.id, employee.employeeId]) {
        if (key != null && key !== '') index.set(String(key), employee)
      }
    }
    return index
  }, [employees])

  const slips = useMemo(
    () => records.map((record) => normalizePayroll(record, employeeIndex.get(String(record.employeeId)))),
    [records, employeeIndex],
  )

  const availablePeriods = useMemo(
    () => [...new Set(slips.map((slip) => slip.payrollMonth).filter(Boolean))].sort((a, b) => b.localeCompare(a)),
    [slips],
  )

  const departments = useMemo(
    () => [ALL_DEPARTMENTS, ...new Set(slips.map((slip) => slip.department).filter(Boolean))],
    [slips],
  )

  /** Employees that actually have a saved slip, so the picker is never a dead end. */
  const employeesWithSlips = useMemo(() => {
    const seen = new Map()
    for (const slip of slips) {
      const key = String(slip.employeeDatabaseId)
      if (!seen.has(key)) seen.set(key, { id: slip.employeeDatabaseId, name: slip.employeeName, code: slip.employeeId })
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [slips])

  const scopedSlips = useMemo(
    () => (scope === ALL_EMPLOYEES ? slips : filterSlips(slips, { employeeId: scope })),
    [slips, scope],
  )

  const filteredPayslips = useMemo(
    () => filterSlips(scopedSlips, { search, department, period: periodFilter }),
    [scopedSlips, search, department, periodFilter],
  )

  const exportSlips = useMemo(
    () => resolveExportSet(filteredPayslips, [...selected]),
    [filteredPayslips, selected],
  )

  const totals = useMemo(() => summarise(exportSlips), [exportSlips])

  const allVisibleSelected =
    filteredPayslips.length > 0 && filteredPayslips.every((slip) => selected.has(slip.id))

  const filtersActive = search.trim() !== '' || department !== ALL_DEPARTMENTS || periodFilter !== ALL_PERIODS

  function toggleRow(id) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllVisible() {
    setSelected((current) => {
      const next = new Set(current)
      if (allVisibleSelected) for (const slip of filteredPayslips) next.delete(slip.id)
      else for (const slip of filteredPayslips) next.add(slip.id)
      return next
    })
  }

  function resetFilters() {
    setSearch('')
    setDepartment(ALL_DEPARTMENTS)
    setPeriodFilter(ALL_PERIODS)
  }

  function handleExport(kind) {
    setExportMessage('')
    if (!exportSlips.length) {
      setExportMessage('There are no payment slips in this selection.')
      return
    }
    try {
      if (kind === 'workbook') {
        const result = exportWorkbook(exportSlips)
        setExportMessage(`Exported ${result.count} slip${result.count === 1 ? '' : 's'} to ${result.filename}.`)
      } else if (kind === 'csv') {
        const result = exportCsv(exportSlips)
        setExportMessage(`Exported ${result.count} slip${result.count === 1 ? '' : 's'} to ${result.filename}.`)
      } else {
        printAllSlips(exportSlips)
        setExportMessage(`Opened ${exportSlips.length} slip${exportSlips.length === 1 ? '' : 's'} for printing.`)
      }
    } catch (error) {
      setExportMessage(error.message || 'The export could not be produced.')
    }
  }

  /**
   * Attendance is fetched when a slip is opened, not up front.
   *
   * One request per preview is cheap; a request per slip in the run would mean
   * 16 round trips to print 16 slips, and the printed set does not include
   * attendance anyway.
   */
  const viewSlip = useCallback(async (payslip) => {
    const requestId = ++slipRequestId.current
    setSelectedPayslip(payslip)
    setAttendance([])
    setAttendanceError('')

    const range = getPeriodRange(payslip.payrollMonth)
    if (!range) {
      setAttendanceError('Attendance cannot be matched because this payroll record has no valid pay period.')
      return
    }

    setAttendanceLoading(true)
    try {
      const query = new URLSearchParams(range)
      const data = await getJson(`/attendance?${query.toString()}`)
      if (requestId !== slipRequestId.current) return
      const found = responseRows(data, ['attendance', 'records'])
      const relatedIds = [String(payslip.employeeDatabaseId), String(payslip.employeeId)].filter(Boolean)
      const employeeAttendance = found.filter((record) => relatedIds.includes(String(record.employeeId)))
      setAttendance(employeeAttendance)
      const overtimeHours = employeeAttendance.reduce((total, record) => total + Number(record.overtime || 0), 0)
      setSelectedPayslip((current) => (current?.id === payslip.id ? { ...current, overtimeHours } : current))
    } catch (error) {
      if (requestId === slipRequestId.current) {
        setAttendanceError(error.message || 'Could not load this employee’s attendance for the pay period.')
      }
    } finally {
      if (requestId === slipRequestId.current) setAttendanceLoading(false)
    }
  }, [])

  function handleDownload(payslip) {
    viewSlip(payslip).then(() => window.setTimeout(() => window.print(), 250))
  }

  return (
    <div className="min-h-full bg-[#F3F4F6] text-slate-950 print:bg-white print:p-0">
      <main className="w-full max-w-[1600px] px-5 py-6 sm:px-8 print:hidden">
        <PageTitle
          eyebrow="Payroll Documentation"
          title="Payment Slips"
          description="Generate, review, and export employee payment slips with detailed earnings, tax deductions, and attendance summaries."
          className="animate-employee-hero mb-8 px-0 py-2"
        />

        {(loadError || employeeWarning) && (
          <div className="mb-5 space-y-2">
            {loadError && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {loadError}
              </p>
            )}
            {employeeWarning && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {employeeWarning}
              </p>
            )}
          </div>
        )}

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-[#0092B8]"><Users size={18} /></div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Payment slips to work with</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Start from the whole payroll and export it in one go, or narrow it to one person.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <select
              value={scope}
              onChange={(event) => { setScope(event.target.value); setSelected(new Set()) }}
              disabled={loading}
              aria-label="Select employee"
              className="min-w-0 rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none focus:border-[#0092B8] focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-50"
            >
              <option value={ALL_EMPLOYEES}>All employees — every saved slip</option>
              {employeesWithSlips.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.name} · {employee.code || employee.id}</option>
              ))}
            </select>
            {loading && (
              <span className="inline-flex items-center justify-center gap-2 px-4 text-sm font-semibold text-slate-500">
                <Loader2 size={16} className="animate-spin" />Loading slips…
              </span>
            )}
          </div>
        </section>

        <section className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, employee ID, department or job title…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#0092B8]"
              />
            </div>
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              aria-label="Filter by department"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
            >
              {departments.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600">
              <CalendarDays size={16} className="text-slate-400" />
              <span className="sr-only">Pay period</span>
              <select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)} className="max-w-48 bg-transparent font-semibold outline-none">
                <option value={ALL_PERIODS}>All pay periods</option>
                {availablePeriods.map((value) => <option key={value} value={value}>{formatPeriod(value)}</option>)}
              </select>
            </label>
            {filtersActive && (
              <button type="button" onClick={resetFilters} className="self-start rounded-lg px-2 py-1 text-xs font-semibold text-[#0092B8] hover:bg-cyan-50 sm:self-auto">
                Clear filters
              </button>
            )}
          </div>

          <ExportMenu count={exportSlips.length} onExport={handleExport} disabled={!exportSlips.length} />
        </section>

        {exportMessage && (
          <p className="mb-4 rounded-xl border border-[#0092B8]/30 bg-cyan-50 px-4 py-3 text-sm text-slate-700">
            {exportMessage}
          </p>
        )}

        <section className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3.5 sm:px-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Run totals</h2>
              <p className="mt-1 text-xs text-slate-500">
                {selected.size
                  ? `${selected.size} slip${selected.size === 1 ? '' : 's'} ticked — the export covers only these.`
                  : `Every slip in view${filtersActive ? ' (filtered)' : ''}.`}
              </p>
            </div>
            {selected.size > 0 && (
              <button type="button" onClick={() => setSelected(new Set())} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Clear ticked rows
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
            <TotalCell label="Slips" value={totals.count} />
            <TotalCell label="Gross salary" value={formatCurrency(totals.grossSalary)} />
            <TotalCell label="Total deductions" value={formatCurrency(totals.totalDeductions)} tone="deduction" />
            <TotalCell label="Net payable" value={formatCurrency(totals.netSalary)} tone="payable" />
            <TotalCell label="Employer cost" value={formatCurrency(totals.employerCost)} />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="font-bold text-slate-900">Saved Payment Slips</h2>
              <p className="mt-1 text-xs text-slate-500">
                {scope === ALL_EMPLOYEES ? 'All employees' : filteredPayslips[0]?.employeeName || 'Selected employee'} ·{' '}
                {filteredPayslips.length} of {scopedSlips.length} slip{scopedSlips.length === 1 ? '' : 's'}
              </p>
            </div>
            <p className="text-xs font-medium text-slate-500">
              {periodFilter === ALL_PERIODS ? 'All available pay periods' : formatPeriod(periodFilter)}
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-[840px] w-full">
              <thead>
                <tr className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      disabled={!filteredPayslips.length}
                      aria-label="Select every slip in view"
                      className="h-4 w-4 rounded border-slate-300 accent-[#0092B8] disabled:opacity-40"
                    />
                  </th>
                  <th className="px-4 py-3">Pay Period</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3 text-right">Gross Salary</th>
                  <th className="px-4 py-3 text-right">Deductions</th>
                  <th className="px-4 py-3 text-right">Net Salary</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500"><span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" />Loading saved slips…</span></td></tr>
                ) : filteredPayslips.length ? filteredPayslips.map((payslip) => (
                  <tr key={payslip.id} className={`hover:bg-slate-50/80 ${selected.has(payslip.id) ? 'bg-cyan-50/50' : ''}`}>
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={selected.has(payslip.id)}
                        onChange={() => toggleRow(payslip.id)}
                        aria-label={`Include ${payslip.employeeName} ${formatPeriod(payslip.payrollMonth)} in the export`}
                        className="h-4 w-4 rounded border-slate-300 accent-[#0092B8]"
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-slate-900">{formatPeriod(payslip.payrollMonth)}</td>
                    <td className="px-4 py-3.5"><p className="font-semibold text-slate-900">{payslip.employeeName}</p><p className="mt-0.5 text-xs text-slate-500">{payslip.employeeId}</p></td>
                    <td className="px-4 py-3.5">{payslip.department}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums">{formatCurrency(payslip.grossSalary)}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-rose-700">{formatCurrency(payslip.totalDeductions)}</td>
                    <td className="px-4 py-3.5 text-right font-bold tabular-nums text-emerald-700">{formatCurrency(payslip.netSalary)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => viewSlip(payslip)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0092B8] px-3 py-2 text-xs font-bold text-white hover:bg-[#007a99]"><FileText size={14} />View</button>
                        <button type="button" onClick={() => handleDownload(payslip)} aria-label={`Print ${payslip.employeeName} ${formatPeriod(payslip.payrollMonth)} slip`} title="Print / Save slip" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><Download size={15} /></button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <FileText className="mx-auto h-9 w-9 text-slate-300" />
                      <p className="mt-3 text-sm font-semibold text-slate-800">
                        {scopedSlips.length ? 'No payment slips match these filters' : 'No saved payment slips yet'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {scopedSlips.length
                          ? 'Clear the filters to widen the search.'
                          : 'Payment slips appear here once a payroll run has been saved for a pay period.'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
              {exportSlips.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
                    <td colSpan={4} className="px-4 py-3.5 text-xs uppercase tracking-wide text-slate-500">
                      {exportSlips.length} slip{exportSlips.length === 1 ? '' : 's'} in this export
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">{formatCurrency(totals.grossSalary)}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-rose-700">{formatCurrency(totals.totalDeductions)}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-emerald-700">{formatCurrency(totals.netSalary)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </Table>
          </div>
        </section>
      </main>

      <PayslipPreview
        payslip={selectedPayslip}
        attendance={attendance}
        attendanceLoading={attendanceLoading}
        attendanceError={attendanceError}
        onClose={() => { slipRequestId.current += 1; setSelectedPayslip(null) }}
      />
    </div>
  )
}

export default PaymentSlips
