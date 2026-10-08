import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Users,
  UserCheck,
  CalendarCheck,
  Wallet,
  ShieldCheck,
  Clock,
  Calendar,
  FileText,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Hourglass,
  Landmark,
  BarChart3,
  CircleDollarSign,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import ApplyLeaveModal from '../components/ApplyLeaveModal'
import PunchCard from '../components/PunchCard'
import { Link } from 'react-router-dom'
import { calcPayroll, formatETB, roundMoney } from '../lib/payroll'
import { leaveBalance, activeLeave, formatDate } from '../lib/leave'
import { SETTINGS } from '../data/settingsData'
import AddEmployeeModal from '../../HR-Manager/components/AddEmployeeModal'
import LuxuryDataTable from '../components/LuxuryDataTable'
import { resolveEmployee, getCurrentUser } from '../lib/currentUser'
import { attendanceTotals } from '../lib/attendanceUtils'
import { fetchEmployees, createEmployee, fetchAttendance, fetchLeaveRequests, fetchPayrollRecords, createLeaveRequest } from '../lib/employerApi'
import useRealtimeRefetch from '../hooks/useRealtimeRefetch'

function Dashboard() {
  const user = getCurrentUser()
  const [employees, setEmployees] = useState([])
  const [attendance, setAttendance] = useState([])
  const [leaveRequests, setLeaveRequests] = useState([])
  const [payrollRecords, setPayrollRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const currentEmployee = resolveEmployee(employees, user)
  const isEmployeeRole = !user?.role || user?.role === 'EMPLOYEE'

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false)
  const [toast, setToast] = useState(null)

  const loadAll = useCallback(() => {
    let cancelled = false
    Promise.all([
      fetchEmployees(),
      fetchAttendance(),
      fetchLeaveRequests(),
      fetchPayrollRecords(),
    ])
      .then(([emps, att, leaves, records]) => {
        if (!cancelled) {
          setEmployees(emps)
          setAttendance(Array.isArray(att) ? att : (att?.attendance || []))
          setLeaveRequests(Array.isArray(leaves) ? leaves : (leaves?.requests || []))
          setPayrollRecords(records)
        }
      })
      .catch(() => { })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => loadAll(), [loadAll])

  const handleAddEmployee = async (employee) => {
    const result = await createEmployee(employee)
    const savedEmployee = result.employee || result
    setEmployees((current) => [savedEmployee, ...current])
    setIsAddModalOpen(false)
    setToast(`Added ${savedEmployee.name} to the team`)
  }

  // Live refresh: refetch when any punch/HR attendance change is pushed
  // over the socket, plus a 60s safety-net poll.
  useRealtimeRefetch('dashboard', loadAll)

  const today = new Date().toLocaleDateString('en-ET', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // 1. Employee-specific metrics
  const myPayroll = useMemo(() => {
    const attTotals = attendanceTotals(attendance)
    return calcPayroll(
      currentEmployee,
      attTotals[currentEmployee.employeeId] || { totalOtHours: 0 }
    )
  }, [currentEmployee, attendance])

  const myLeaveRequests = useMemo(
    () =>
      leaveRequests.filter(
        (r) =>
          r.employeeId === currentEmployee.id ||
          r.employeeId === currentEmployee.employeeId ||
          r.businessId === currentEmployee.employeeId ||
          (r.employeeName && currentEmployee.name && r.employeeName.toLowerCase() === currentEmployee.name.toLowerCase())
      ),
    [leaveRequests, currentEmployee.id, currentEmployee.employeeId]
  )

  const myActiveLeave = useMemo(() => activeLeave(myLeaveRequests), [myLeaveRequests])

  const myLeave = useMemo(() => {
    return leaveBalance(currentEmployee.joinDate, myLeaveRequests)
  }, [currentEmployee.joinDate, myLeaveRequests])

  const myAttendance = useMemo(() => {
    const records = attendance.filter((a) => a.employeeId === currentEmployee.employeeId)
    let regular = 0
    let overtime = 0
    let present = 0
    records.forEach((a) => {
      regular += a.regular || 0
      overtime += a.overtime || 0
      if (a.status === 'Present') present += 1
    })
    return { records, regular, overtime, present }
  }, [attendance, currentEmployee.employeeId])

  // 2. Company-wide metrics for Employer Admin role
  const companyData = useMemo(() => {
    const attTotals = attendanceTotals(attendance)
    const payrollRows = employees.map((emp) =>
      calcPayroll(emp, attTotals[emp.employeeId] || { totalOtHours: 0 })
    )
    const activeRows = payrollRows.filter((r) => r.active)

    const totalGross = roundMoney(activeRows.reduce((s, r) => s + r.gross, 0))
    const totalNet = roundMoney(activeRows.reduce((s, r) => s + r.netSalary, 0))
    const totalTax = roundMoney(activeRows.reduce((s, r) => s + r.incomeTax, 0))
    const totalPension = roundMoney(
      activeRows.reduce((s, r) => s + r.pensionEmployee + r.pensionEmployer, 0)
    )
    const totalOvertime = roundMoney(activeRows.reduce((s, r) => s + r.otHours, 0))
    const pendingLeaves = leaveRequests.filter((r) => r.approvalStatus === 'Pending').length

    // Headcount by employment type
    const byType = {}
    employees.forEach((e) => {
      byType[e.employmentType] = (byType[e.employmentType] || 0) + 1
    })

    // Department snapshot: headcount + gross cost
    const deptMap = {}
    payrollRows.forEach((r) => {
      if (!r.active) return
      if (!deptMap[r.department]) deptMap[r.department] = { department: r.department, count: 0, gross: 0 }
      deptMap[r.department].count += 1
      deptMap[r.department].gross += r.gross
    })
    const byDept = Object.values(deptMap)
      .map((d) => ({ ...d, gross: roundMoney(d.gross) }))
      .sort((a, b) => b.gross - a.gross)
    const maxDeptGross = Math.max(1, ...byDept.map((d) => d.gross))

    // 6-month payroll cost trend — REAL history from PayrollRecord rows
    // (current month shows the live computed run, past months the certified
    // records; months with no runs are simply absent from the chart).
    const monthKeys = [...new Set(payrollRecords.map((r) => r.payrollMonth))]
      .sort()
      .slice(-6)
    const trend = monthKeys.map((key) => {
      const monthRows = payrollRecords.filter((r) => r.payrollMonth === key)
      const isCurrentMonth = key === new Date().toISOString().slice(0, 7)
      if (isCurrentMonth) {
        // Show the live computed position for the current run.
        return {
          month: new Date(`${key}-01T00:00:00`).toLocaleString('en-ET', { month: 'short' }),
          gross: totalGross,
          net: totalNet,
        }
      }
      return {
        month: new Date(`${key}-01T00:00:00`).toLocaleString('en-ET', { month: 'short' }),
        gross: roundMoney(monthRows.reduce((s, r) => s + (r.grossSalary || 0), 0)),
        net: roundMoney(monthRows.reduce((s, r) => s + (r.netSalary || 0), 0)),
      }
    })

    return {
      totalGross,
      totalNet,
      totalTax,
      totalPension,
      totalOvertime,
      pendingLeaves,
      headcount: employees.length,
      activeCount: employees.filter((e) => e.employmentStatus === 'Active').length,
      onLeave: employees.filter((e) => e.employmentStatus === 'On Leave').length,
      byType,
      byDept,
      maxDeptGross,
      trend,
      monthlyStatutory: roundMoney(totalTax + totalPension),
    }
  }, [employees, attendance, leaveRequests, payrollRecords])

  const workforceShare = companyData.headcount
    ? Math.round((companyData.activeCount / companyData.headcount) * 100)
    : 0

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          1. WELCOME HEADER (Personalized for Current Employee)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-gray-100">
              Welcome back, {currentEmployee.name.split(' ')[0]}!
            </h1>
            <span className="text-[11px] font-bold text-gray-500 bg-gray-100 dark:bg-[#1c2026] dark:text-gray-400 border border-gray-200 dark:border-[#262b31] px-2 py-0.5 rounded-md">
              {currentEmployee.jobTitle}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {SETTINGS.company.name} · {currentEmployee.department} Department · ID: {currentEmployee.employeeId} · {today}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gray-950 text-white dark:bg-[#3a4149] dark:hover:bg-gray-600 text-xs font-semibold hover:bg-gray-800 transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <CalendarCheck size={15} />
            <span>Apply for Leave</span>
          </button>
          <Link
            to="/employer/payslips"
            className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5"
          >
            <FileText size={15} />
            <span>My Payslip</span>
          </Link>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. LIVE ATTENDANCE PUNCH (Check In / Check Out)
         ───────────────────────────────────────────────────────────── */}
      <PunchCard />

      {/* ─────────────────────────────────────────────────────────────
          3. PERSONAL EMPLOYEE KPIS (Only Current User Data)
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Net Salary */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-2xs dark:bg-[#15181d] dark:border-[#262b31]">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Wallet size={18} />
          </div>
          <p className="text-2xl font-black text-gray-950 dark:text-gray-100 mt-3 tracking-tight tabular-nums">
            {formatETB(myPayroll.netSalary)}
          </p>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Net Monthly Salary</span>
            <span className="text-[10px] text-emerald-600 font-semibold">Active</span>
          </div>
        </div>

        {/* KPI 2: Remaining Leave */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-2xs dark:bg-[#15181d] dark:border-[#262b31]">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CalendarCheck size={18} />
          </div>
          <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400 mt-3 tracking-tight">
            {myActiveLeave ? myActiveLeave.daysLeft : myLeave.remaining}{' '}
            <span className="text-xs font-normal text-gray-400">days</span>
          </p>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Remaining Annual Leave</span>
            <span className="text-[10px] text-gray-400">{myLeave.taken} days taken</span>
          </div>
        </div>

        {/* KPI 3: Attendance */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-2xs dark:bg-[#15181d] dark:border-[#262b31]">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <UserCheck size={18} />
          </div>
          <p className="text-2xl font-black text-teal-700 dark:text-teal-400 mt-3 tracking-tight">
            {myAttendance.present} <span className="text-xs font-normal text-gray-400">shifts</span>
          </p>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Present This Month</span>
            <span className="text-[10px] text-teal-600 font-semibold">{myAttendance.regular}h regular</span>
          </div>
        </div>

        {/* KPI 4: Overtime */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-2xs dark:bg-[#15181d] dark:border-[#262b31]">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Clock size={18} />
          </div>
          <p className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-3 tracking-tight">
            {myAttendance.overtime}h
          </p>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Overtime Logged</span>
            <span className="text-[10px] text-purple-600 font-semibold">{formatETB(myPayroll.otPay)}</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. COMPANY OVERVIEW (Employer/Admin view)
         ───────────────────────────────────────────────────────────── */}
      {!isEmployeeRole && (
        <section aria-labelledby="company-overview-heading" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="company-overview-heading" className="text-base font-bold text-gray-950 dark:text-gray-100 flex items-center gap-2">
                <Building2 size={17} className="text-gray-500 dark:text-gray-400" />
                Company Overview
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Workforce, payroll &amp; statutory position for the current run
              </p>
            </div>
            <Link
              to="/employer/reports"
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-[#262b31] bg-white dark:bg-[#1c2026] text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#252a32] transition-colors"
            >
              <BarChart3 size={13} /> Full Reports
            </Link>
          </div>

          {/* Overview stat strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#15181d] rounded-2xl p-5 border border-gray-200/90 dark:border-[#262b31] shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Active Workforce</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Users size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-gray-950 dark:text-gray-100 mt-3 tabular-nums">
                {companyData.activeCount}
                <span className="text-sm font-semibold text-gray-400 dark:text-gray-500"> / {companyData.headcount}</span>
              </p>
              {/* Workforce share bar */}
              <div className="mt-2.5 h-1.5 w-full bg-gray-100 dark:bg-[#1c2026] rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${workforceShare}%` }} />
              </div>
              <p className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-1.5">
                {workforceShare}% of headcount active
                {companyData.onLeave > 0 && ` · ${companyData.onLeave} on leave`}
              </p>
            </div>

            <div className="bg-white dark:bg-[#15181d] rounded-2xl p-5 border border-gray-200/90 dark:border-[#262b31] shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Monthly Gross Payroll</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CircleDollarSign size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-gray-950 dark:text-gray-100 mt-3 tabular-nums">{formatETB(companyData.totalGross)}</p>
              <p className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-1">
                <ArrowUpRight size={11} className="text-emerald-600" />
                {formatETB(companyData.totalNet)} net disbursed
              </p>
            </div>

            <div className="bg-white dark:bg-[#15181d] rounded-2xl p-5 border border-gray-200/90 dark:border-[#262b31] shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Statutory Obligations</span>
                <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Landmark size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-gray-950 dark:text-gray-100 mt-3 tabular-nums">{formatETB(companyData.monthlyStatutory)}</p>
              <p className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-1.5">
                PAYE {formatETB(companyData.totalTax)} · Pension {formatETB(companyData.totalPension)}
              </p>
            </div>

            <div className="bg-white dark:bg-[#15181d] rounded-2xl p-5 border border-gray-200/90 dark:border-[#262b31] shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Pending Approvals</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Hourglass size={16} />
                </div>
              </div>
              <p className={`text-2xl font-black mt-3 tabular-nums ${companyData.pendingLeaves > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-950 dark:text-gray-100'}`}>
                {companyData.pendingLeaves}
              </p>
              <p className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-1.5">
                {companyData.pendingLeaves > 0 ? 'Leave requests awaiting review' : 'All caught up — nothing pending'}
              </p>
            </div>
          </div>

          {/* Trend + workforce composition + dept snapshot */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* 6-month payroll trend */}
            <div className="lg:col-span-7 bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100">Payroll Cost — 6-Month Trend</h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Certified runs · current month live</p>
                </div>
                <div className="flex items-center gap-3 text-[10.5px] font-semibold">
                  <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Gross</span>
                  <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Net</span>
                </div>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={companyData.trend} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ovGrossGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ovNetGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#9ca3af" strokeOpacity={0.25} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        fontSize: 12,
                      }}
                      formatter={(val, key) => [formatETB(val), key === 'gross' ? 'Gross Payroll' : 'Net Disbursed']}
                    />
                    <Area type="monotone" dataKey="gross" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#ovGrossGrad)" />
                    <Area type="monotone" dataKey="net" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#ovNetGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right column: composition + departments */}
            <div className="lg:col-span-5 space-y-4">
              {/* Workforce composition */}
              <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs p-5">
                <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100">Workforce Composition</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Headcount by employment type</p>
                <div className="mt-3.5 space-y-2.5">
                  {Object.entries(companyData.byType).map(([type, count]) => (
                    <div key={type} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-[11px] font-semibold text-gray-600 dark:text-gray-400 truncate">{type}</span>
                      <div className="flex-1 h-5 bg-gray-100 dark:bg-[#1c2026] rounded-md overflow-hidden">
                        <div
                          className="h-full bg-gray-900 dark:bg-gray-300 rounded-md"
                          style={{ width: `${Math.round((count / companyData.headcount) * 100)}%` }}
                        />
                      </div>
                      <span className="w-14 text-right text-[11px] font-bold text-gray-950 dark:text-gray-100 tabular-nums">{count} staff</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top departments by payroll cost */}
              <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100">Departments</h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Gross cost · current run</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1c2026] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#262b31]">
                    {companyData.byDept.length} centers
                  </span>
                </div>
                <div className="mt-3.5 space-y-2.5">
                  {companyData.byDept.slice(0, 5).map((d) => (
                    <div key={d.department} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-[11px] font-semibold text-gray-600 dark:text-gray-400 truncate">{d.department}</span>
                      <div className="flex-1 h-5 bg-gray-100 dark:bg-[#1c2026] rounded-md overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-md"
                          style={{ width: `${Math.round((d.gross / companyData.maxDeptGross) * 100)}%` }}
                        />
                      </div>
                      <span className="w-20 text-right text-[11px] font-bold text-gray-950 dark:text-gray-100 tabular-nums">{formatETB(d.gross)}</span>
                    </div>
                  ))}
                </div>
                <Link
                  to="/employer/reports"
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View department allocation in Reports <ArrowRight size={11} />
                </Link>
              </div>
            </div>
          </div>

          {/* Statutory compliance note */}
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20 p-4">
            <ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11.5px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
              <span className="font-bold">Compliance status: on track.</span> All {companyData.activeCount} active employees are processed
              under Proc. 1395/2025 (income tax) and Proc. 715/2011 (pension 7% + 11%). Current statutory liability of{' '}
              <span className="font-bold">{formatETB(companyData.monthlyStatutory)}</span> is due for remittance with this pay run.
            </p>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. QUICK ACCESS TILES
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/employer/leave"
          className="p-4 rounded-2xl bg-white dark:bg-[#15181d] border border-gray-200/90 dark:border-[#262b31] shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-950 dark:text-gray-100">Leave Applications</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">View status &amp; apply</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to="/employer/payslips"
          className="p-4 rounded-2xl bg-white dark:bg-[#15181d] border border-gray-200/90 dark:border-[#262b31] shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-950 dark:text-gray-100">Monthly Payslip</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Tax &amp; pension details</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
        </Link>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. MY RECENT LEAVE REQUESTS (Qirb-Alga Luxury Table)
         ───────────────────────────────────────────────────────────── */}
      <LuxuryDataTable
        title="My Recent Leave Requests"
        subtitle={`Recent time-off applications submitted by ${currentEmployee.name}`}
        data={myLeaveRequests}
        searchable={true}
        searchPlaceholder="Search my requests..."
        searchKeys={['id', 'leaveType', 'remarks', 'approvalStatus']}
        exportable={true}
        exportFilename={`My_Leave_Requests_${currentEmployee.employeeId}`}
        columns={[
          {
            key: 'id',
            header: 'Req ID',
            sortable: true,
            render: (r) => (
              <span className="font-mono text-gray-500 dark:text-gray-400 font-semibold">{r.id}</span>
            ),
          },
          {
            key: 'leaveType',
            header: 'Leave Type',
            sortable: true,
            render: (r) => (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/60">
                {r.leaveType}
              </span>
            ),
          },
          {
            key: 'startDate',
            header: 'Start Date',
            sortable: true,
            render: (r) => <span className="text-gray-600 dark:text-gray-400">{r.startDate}</span>,
          },
          {
            key: 'endDate',
            header: 'End Date',
            sortable: true,
            render: (r) => <span className="text-gray-600 dark:text-gray-400">{r.endDate}</span>,
          },
          {
            key: 'days',
            header: 'Days',
            sortable: true,
            align: 'center',
            render: (r) => (
              <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">{r.days}d</span>
            ),
          },
          {
            key: 'approvalStatus',
            header: 'Status',
            sortable: true,
            align: 'center',
            render: (r) => (
              <span
                className={`text-[10px] font-bold ${r.approvalStatus === 'Approved'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : r.approvalStatus === 'Pending'
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-rose-700 dark:text-rose-400'
                  }`}
              >
                {r.approvalStatus}
              </span>
            ),
          },
        ]}
      />

      {/* Apply for Leave Modal */}
      <ApplyLeaveModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onApply={async (newReq) => {
          try {
            const result = await createLeaveRequest({
              employeeId: currentEmployee.id || currentEmployee.employeeId,
              leaveType: newReq.leaveType,
              startDate: newReq.startDate,
              endDate: newReq.endDate,
              remarks: newReq.remarks,
              days: newReq.days,
              requestDate: newReq.requestDate,
            })
            const request = result?.request || result?.leaveRequest || result?.record || result
            if (request && typeof request === 'object' && request.id) {
              setLeaveRequests((prev) => {
                const list = Array.isArray(prev) ? prev : []
                if (list.some((r) => r.id === request.id)) return list
                return [request, ...list]
              })
            }
            window.dispatchEvent(new CustomEvent('hr-leave-request-created', { detail: request }))
            try {
              localStorage.setItem('hr-leave-request-created', JSON.stringify({ id: request?.id, at: Date.now() }))
            } catch { }
            if ('BroadcastChannel' in window) {
              const channel = new BroadcastChannel('hr-leave-requests')
              channel.postMessage({ type: 'created', request })
              channel.close()
            }
            showToast('Leave request submitted successfully for approval')
          } catch (err) {
            showToast(err.message || 'Failed to submit leave request')
          }
          setIsLeaveModalOpen(false)
        }}
        employee={currentEmployee}
      />

      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-gray-950 text-white dark:bg-[#3a4149] px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium animate-in fade-in duration-200">
          {toast}
        </div>
      )}

      {/* Add Employee Modal (available if needed) */}
      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddEmployee}
      />
    </div>
  )
}

export default Dashboard
