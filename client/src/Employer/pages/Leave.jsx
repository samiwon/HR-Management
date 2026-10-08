import { useState, useMemo, useEffect } from 'react'
import { Plus, TriangleAlert } from 'lucide-react'
import { leaveBalance, findOverlaps, formatDate } from '../lib/leave'
import LuxuryDataTable from '../components/LuxuryDataTable'
import ApplyLeaveModal from '../components/ApplyLeaveModal'
import { resolveEmployee, getCurrentUser } from '../lib/currentUser'
import { createLeaveRequest } from '../lib/employerApi'
import { fetchEmployees, fetchLeaveRequests } from '../lib/employerApi'

const STATUS_STYLES = {
  Approved: 'text-emerald-700 dark:text-emerald-400',
  Pending: 'text-amber-700 dark:text-amber-400',
  Rejected: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60',
}

const LEAVE_COLORS = {
  'Annual Leave': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',
  'Sick Leave': 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400',
  'Maternity Leave': 'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400',
  'Paternity Leave': 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  'Study Leave': 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400',
  'Unpaid Leave': 'bg-gray-100 text-gray-600 dark:bg-[#1c2026] dark:text-gray-400',
}

function Leave() {
  const user = getCurrentUser()
  const [employees, setEmployees] = useState([])
  const [leaveRequests, setLeaveRequests] = useState([])
  const currentEmployee = useMemo(
    () => resolveEmployee(employees, user),
    [employees, user],
  )
  const requests = useMemo(() => {
    const list = Array.isArray(leaveRequests) ? leaveRequests : []
    if (list.length === 0) return []
    if (currentEmployee?.id || currentEmployee?.employeeId) {
      const filtered = list.filter(
        (r) =>
          r.employeeId === currentEmployee.id ||
          r.employeeId === currentEmployee.employeeId ||
          r.businessId === currentEmployee.employeeId ||
          (r.employeeName && currentEmployee.name && r.employeeName.toLowerCase() === currentEmployee.name.toLowerCase()),
      )
      return filtered.length > 0 ? filtered : list
    }
    return list
  }, [leaveRequests, currentEmployee?.id, currentEmployee?.employeeId, currentEmployee?.name])

  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState(null)
  const [pendingReload, setPendingReload] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchEmployees(), fetchLeaveRequests()])
      .then(([emps, leaves]) => {
        if (!cancelled) {
          setEmployees(Array.isArray(emps) ? emps : [])
          const list = Array.isArray(leaves) ? leaves : leaves?.requests || leaves?.records || []
          setLeaveRequests(list)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPendingReload(false)
      })
    return () => {
      cancelled = true
    }
  }, [pendingReload])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const overlaps = useMemo(() => findOverlaps(requests), [requests])
  const overlapIds = useMemo(() => new Set(overlaps.flat()), [overlaps])

  const myBalance = useMemo(
    () => leaveBalance(currentEmployee.joinDate, requests),
    [currentEmployee.joinDate, requests]
  )

  const handleApply = async (newReq) => {
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
      } catch {}
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('hr-leave-requests')
        channel.postMessage({ type: 'created', request })
        channel.close()
      }
      setPendingReload((prev) => !prev)
      showToast('Leave request submitted successfully for approval')
    } catch (err) {
      showToast(err.message || 'Failed to submit leave request')
    }
    setShowForm(false)
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-gray-950 text-white dark:bg-[#3a4149] dark:hover:bg-gray-600 px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium animate-in fade-in duration-200">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-100">
              My Leave &amp; Time Off
            </h1>
            <span className="text-[11px] font-bold text-gray-500 bg-gray-100 dark:bg-[#1c2026] dark:text-gray-400 border border-gray-200 dark:border-[#262b31] px-2 py-0.5 rounded-md">
              {currentEmployee.name} ({currentEmployee.employeeId})
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Personal leave requests, tenure accruals &amp; remaining balances per Labour Proclamation No. 1156/2019
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 rounded-xl bg-gray-950 text-white dark:bg-[#3a4149] dark:hover:bg-gray-600 text-xs font-semibold flex items-center gap-1.5 hover:bg-gray-800 transition-colors cursor-pointer shadow-xs"
        >
          <Plus size={15} />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* Employee Personal Balance KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#15181d] rounded-2xl p-5 border border-gray-200/90 dark:border-[#262b31] shadow-2xs">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Annual Entitlement</span>
          <p className="text-3xl font-black text-gray-950 dark:text-gray-100 mt-2">
            {myBalance.entitled} <span className="text-xs font-normal text-gray-400">days</span>
          </p>
          <span className="text-[10px] text-gray-500 mt-1 block">
            Joined {currentEmployee.joinDate} · 16d + tenure
          </span>
        </div>

        <div className="bg-white dark:bg-[#15181d] rounded-2xl p-5 border border-gray-200/90 dark:border-[#262b31] shadow-2xs">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Annual Taken</span>
          <p className="text-3xl font-black text-amber-600 mt-2">
            {myBalance.taken} <span className="text-xs font-normal text-amber-500/70">days</span>
          </p>
          <span className="text-[10px] text-amber-600/80 mt-1 block">Approved absences this year</span>
        </div>

        <div className="bg-white dark:bg-[#15181d] rounded-2xl p-5 border border-gray-200/90 dark:border-[#262b31] shadow-2xs">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Annual Remaining</span>
          <p className="text-3xl font-black text-emerald-600 mt-2">
            {myBalance.remaining} <span className="text-xs font-normal text-emerald-500/70">days</span>
          </p>
          <span className="text-[10px] text-emerald-600/80 mt-1 block">Available balance</span>
        </div>

        <div className="bg-white dark:bg-[#15181d] rounded-2xl p-5 border border-gray-200/90 dark:border-[#262b31] shadow-2xs">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Sick Leave Balance</span>
          <p className="text-3xl font-black text-teal-600 mt-2">
            {myBalance.sickRemaining}{' '}
            <span className="text-xs font-normal text-gray-400">/ 10 days</span>
          </p>
          <span className="text-[10px] text-gray-500 mt-1 block">{myBalance.sickDaysUsed} days used</span>
        </div>
      </div>

      {/* New Request Form — Popup Modal (shared ApplyLeaveModal) */}
      <ApplyLeaveModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onApply={handleApply}
        employee={currentEmployee}
      />

      {/* My Leave Requests Table (Qirb-Alga Luxury Table) */}
      <LuxuryDataTable
        title="My Leave History"
        subtitle={`All time-off applications submitted by ${currentEmployee.name}`}
        countBadge={`${requests.length} requests`}
        data={requests}
        searchable={true}
        searchPlaceholder="Search my requests..."
        searchKeys={['id', 'leaveType', 'remarks', 'approvalStatus', 'approvedBy']}
        exportable={true}
        exportFilename={`Leave_History_${currentEmployee.employeeId}`}
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
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${LEAVE_COLORS[r.leaveType]}`}>
                {r.leaveType}
              </span>
            ),
          },
          {
            key: 'startDate',
            header: 'Start Date',
            sortable: true,
            render: (r) => (
              <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(r.startDate)}</span>
            ),
          },
          {
            key: 'endDate',
            header: 'End Date',
            sortable: true,
            render: (r) => (
              <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(r.endDate)}</span>
            ),
          },
          {
            key: 'days',
            header: 'Working Days',
            sortable: true,
            align: 'center',
            render: (r) => (
              <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">{r.days}d</span>
            ),
          },
          {
            key: 'remarks',
            header: 'Reason / Remarks',
            render: (r) => (
              <span className="text-gray-500 dark:text-gray-400 max-w-xs truncate block">
                {r.remarks || '—'}
              </span>
            ),
          },
          {
            key: 'approvedBy',
            header: 'Reviewed By',
            render: (r) => (
              <span className="text-gray-600 dark:text-gray-400 text-xs">
                {r.approvedBy || (r.approvalStatus === 'Pending' ? 'Pending HR Review' : 'HR Manager')}
              </span>
            ),
          },
          {
            key: 'approvalStatus',
            header: 'Status',
            sortable: true,
            align: 'center',
            render: (r) => (
              <div className="flex items-center gap-2">
                <span className={`text-[10.5px] font-semibold ${STATUS_STYLES[r.approvalStatus] || ''}`}>
                  {r.approvalStatus}
                </span>
                {overlapIds.has(r.id) && (
                  <span
                    className="flex items-center gap-1 text-[10px] text-rose-600 font-semibold"
                    title="Overlapping request detected"
                  >
                    <TriangleAlert size={11} />
                    Overlap
                  </span>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}

export default Leave
