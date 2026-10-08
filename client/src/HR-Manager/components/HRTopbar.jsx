import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  Cake,
  ChevronDown,
  CircleDollarSign,
  LogOut,
  Search,
  Settings,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMessagingOptional } from '../../Employer/context/messagingStore'
import { authHeaders } from '../../lib/hrApi'
import HRAssistant from './HRAssistant'

const rows = (data) => {
  if (Array.isArray(data)) return data
  const candidates = [data?.employees, data?.leaveRequests, data?.requests, data?.records, data?.data]
  const list = candidates.find(Array.isArray)
  return list || (data?.data && typeof data.data === 'object' ? rows(data.data) : [])
}
const currentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
const getEmployeeName = (employee) => employee.name || [employee.firstName, employee.lastName].filter(Boolean).join(' ') || 'Employee'
const getDateOnly = (value) => String(value || '').split('T')[0]

function HRTopbar() {
  const navigate = useNavigate()
  const messaging = useMessagingOptional()
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationTab, setNotificationTab] = useState('updates')
  const [pendingRequests, setPendingRequests] = useState([])
  const [systemUpdates, setSystemUpdates] = useState([])
  const [dismissedUpdates, setDismissedUpdates] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('hr-dismissed-updates') || '[]')) } catch { return new Set() }
  })
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const profileRef = useRef(null)
  const notificationsRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function loadNotifications() {
      try {
        const month = currentMonth()
        const [leaveResponse, employeeResponse, payrollResponse] = await Promise.all([
          fetch('/api/hr-manager/leave', { headers: authHeaders(), cache: 'no-store' }),
          fetch('/api/hr-manager/employees', { headers: authHeaders(), cache: 'no-store' }),
          fetch(`/api/hr-manager/payroll?payrollMonth=${month}`, { headers: authHeaders(), cache: 'no-store' }),
        ])
        const [leaveData, employeeData, payrollData] = await Promise.all([
          leaveResponse.ok ? leaveResponse.json() : [],
          employeeResponse.ok ? employeeResponse.json() : [],
          payrollResponse.ok ? payrollResponse.json() : [],
        ])
        const requests = rows(leaveData)
        const employees = rows(employeeData)
        const payroll = rows(payrollData)
        const updates = []
        if (!cancelled) {
          const pending = requests.filter((request) => String(request.approvalStatus || 'Pending').toLowerCase() === 'pending').sort((a, b) => String(b.createdAt || b.requestDate || '').localeCompare(String(a.createdAt || a.requestDate || '')))
          setPendingRequests(pending)
          pending.forEach((request) => updates.push({
            id: `leave-request-${request.id}`,
            type: 'leave-request',
            title: 'New employee leave request',
            message: `${request.employeeName || 'Employee'} · ${request.leaveType || 'Leave'} · ${request.days || 0} day(s)`,
            action: 'Review request',
            href: '/hr-manager/leave#leave-review-inbox',
          }))
          const now = Date.now()
          requests.filter((request) => request.approvalStatus === 'Approved').forEach((request) => {
            const decisionDate = new Date(request.approvedDate || request.updatedAt || request.createdAt || 0).getTime()
            if (decisionDate && now - decisionDate >= 0 && now - decisionDate < 7 * 24 * 60 * 60 * 1000) {
              updates.push({
                id: `leave-approved-${request.id}`,
                type: 'leave',
                title: 'Leave request approved',
                message: `${request.employeeName || 'Employee'} · ${request.leaveType || 'Leave'} · ${request.days || 0} day(s)`,
                action: 'View leave request',
                href: '/hr-manager/leave#leave-review-inbox',
              })
            }
          })
          if (payroll.length > 0) {
            const monthDate = new Date(`${month}-01T00:00:00`)
            updates.push({
              id: `payroll-ready-${month}`,
              type: 'payroll',
              title: `${monthDate.toLocaleDateString('en-US', { month: 'long' })} payroll is ready`,
              message: `${payroll.length} payroll record${payroll.length === 1 ? '' : 's'} available for review.`,
              action: 'Open payroll',
              href: '/hr-manager/payroll',
            })
          }
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          const tomorrowMonthDay = `${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
          employees.filter((employee) => getDateOnly(employee.dateOfBirth || employee.dob).slice(5, 10) === tomorrowMonthDay).forEach((employee) => {
            const name = getEmployeeName(employee)
            updates.push({
              id: `birthday-${employee.id || employee.employeeId}-${tomorrowMonthDay}`,
              type: 'birthday',
              title: 'Employee birthday tomorrow',
              message: `${name} has a birthday tomorrow.`,
              action: 'View employee',
              href: `/hr-manager/employees?search=${encodeURIComponent(name)}`,
            })
          })
          setSystemUpdates(updates)
        }
      } catch {
        // Keep the notification control usable even if leave notifications are unavailable.
      }
    }
    loadNotifications()
    const interval = window.setInterval(loadNotifications, 15000)
    window.addEventListener('hr-leave-updated', loadNotifications)
    window.addEventListener('hr-leave-request-created', loadNotifications)
    const handleStorage = (event) => {
      if (event.key === 'hr-leave-request-created') loadNotifications()
    }
    window.addEventListener('storage', handleStorage)
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel('hr-leave-requests') : null
    if (channel) channel.onmessage = loadNotifications
    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('hr-leave-updated', loadNotifications)
      window.removeEventListener('hr-leave-request-created', loadNotifications)
      window.removeEventListener('storage', handleStorage)
      channel?.close()
    }
  }, [])

  function openSystemUpdate(update) {
    const next = new Set(dismissedUpdates).add(update.id)
    setDismissedUpdates(next)
    localStorage.setItem('hr-dismissed-updates', JSON.stringify([...next]))
    setNotificationsOpen(false)
    navigate(update.href)
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus()
    }
  }, [searchOpen])

  function handleLogout() {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('authToken')

    setProfileOpen(false)

    navigate('/login')
  }

  function handleSearchSubmit(event) {
    event.preventDefault()

    const query = searchValue.trim()

    if (!query) return

    // Keep the current search behavior without changing
    // the rest of the HR dashboard functionality.
    window.dispatchEvent(
      new CustomEvent('hr-global-search', {
        detail: {
          query,
        },
      }),
    )
    navigate(`/hr-manager/employees?search=${encodeURIComponent(query)}`)
    setSearchOpen(false)
  }

  const visibleUpdates = systemUpdates.filter((update) => !dismissedUpdates.has(update.id))
  const unreadMessagesCount = (messaging?.contacts || []).reduce((sum, c) => sum + (c.unread || 0), 0)
  const notificationCount = unreadMessagesCount + pendingRequests.length

  function dismissAllUpdates() {
    const allIds = new Set([...dismissedUpdates, ...systemUpdates.map((u) => u.id)])
    setDismissedUpdates(allIds)
    try {
      localStorage.setItem('hr-dismissed-updates', JSON.stringify([...allIds]))
    } catch {}
    if (messaging?.markAllRead) {
      messaging.markAllRead()
    }
  }

  return (
    <>
    <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-5 backdrop-blur-xl lg:px-7">
      {/* Left side */}
      <div className="flex min-w-0 items-center">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            HR Management
          </p>

          <h2 className="mt-0.5 truncate text-[17px] font-bold tracking-[-0.02em] text-slate-950">
            HR Dashboard
          </h2>
        </div>
      </div>

        {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search */}
        <div className="relative">
          {searchOpen ? (
            <form
              onSubmit={handleSearchSubmit}
              className="flex h-10 w-[220px] items-center rounded-xl border border-slate-200 bg-slate-50 px-3 transition-all focus-within:border-slate-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-slate-100 sm:w-[280px]"
            >
              <Search
                size={17}
                strokeWidth={1.9}
                className="shrink-0 text-slate-400"
              />

              <input
                ref={searchInputRef}
                value={searchValue}
                onChange={(event) =>
                  setSearchValue(event.target.value)
                }
                placeholder="Search employees by name, ID, or department…"
                className="ml-2 min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 placeholder:animate-pulse"
              />

              <button
                type="button"
                onClick={() => {
                  setSearchValue('')
                  setSearchOpen(false)
                }}
                className="ml-2 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-700"
                aria-label="Close search"
              >
                Esc
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-slate-500 transition-all hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              aria-label="Search"
            >
              <Search size={19} strokeWidth={1.8} />
            </button>
          )}
        </div>

        {/* Leave and employee message notifications */}
        <div ref={notificationsRef} className="relative">
          <button type="button" onClick={() => setNotificationsOpen((open) => !open)} className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-slate-500 transition-all hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900" aria-label="Notifications" aria-expanded={notificationsOpen}>
            <Bell size={19} strokeWidth={1.8} />
            {notificationCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">{notificationCount > 9 ? '9+' : notificationCount}</span>}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-bold text-slate-900">Notifications</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">
                    {notificationCount > 0 ? `${notificationCount} new` : 'All caught up'}
                  </span>
                  {(visibleUpdates.length > 0 || notificationCount > 0) && (
                    <button
                      type="button"
                      onClick={dismissAllUpdates}
                      className="text-[11px] font-semibold text-[#0092B8] hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1 border-b border-slate-100 p-2">
                <button type="button" onClick={() => setNotificationTab('updates')} className={`rounded-lg px-1.5 py-2 text-[11px] font-semibold ${notificationTab === 'updates' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Updates ({visibleUpdates.length})</button>
                <button type="button" onClick={() => setNotificationTab('leave')} className={`rounded-lg px-1.5 py-2 text-[11px] font-semibold ${notificationTab === 'leave' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Leave ({pendingRequests.length})</button>
                <button type="button" onClick={() => setNotificationTab('messages')} className={`rounded-lg px-1.5 py-2 text-[11px] font-semibold ${notificationTab === 'messages' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Messages ({messaging?.totalUnread || 0})</button>
              </div>
              {notificationTab === 'updates' ? (
                visibleUpdates.length ? <div className="max-h-80 overflow-y-auto">{visibleUpdates.map((update) => {
                  const UpdateIcon = update.type === 'birthday' ? Cake : update.type === 'payroll' ? CircleDollarSign : Bell
                  return <button key={update.id} type="button" onClick={() => openSystemUpdate(update)} className="flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3.5 text-left transition hover:bg-slate-50"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-[#0092B8]"><UpdateIcon size={17} /></span><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-900">{update.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{update.message}</span><span className="mt-2 block text-[11px] font-bold text-[#0092B8]">{update.action} →</span></span></button>
                })}</div> : <p className="px-4 py-7 text-center text-xs text-slate-500">No actionable HR updates right now.</p>
              ) : notificationTab === 'leave' ? (
                pendingRequests.length ? <div className="max-h-72 overflow-y-auto">{pendingRequests.slice(0, 6).map((request) => <button key={request.id} type="button" onClick={() => { setNotificationsOpen(false); navigate('/hr-manager/leave#leave-review-inbox') }} className="w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50"><p className="text-xs font-bold text-slate-900">{request.employeeName || 'Employee'}</p><p className="mt-1 text-xs text-slate-500">{request.leaveType || 'Leave'} · {request.days || 0} day(s)</p><p className="mt-1 text-[10px] text-slate-400">{request.startDate || '—'} to {request.endDate || '—'}</p></button>)}</div> : <p className="px-4 py-6 text-center text-xs text-slate-500">No pending leave requests.</p>
              ) : (
                messaging?.contacts?.filter((contact) => contact.lastMessage || contact.unread > 0).length ? <div className="max-h-72 overflow-y-auto">{messaging.contacts.filter((contact) => contact.lastMessage || contact.unread > 0).slice(0, 8).map((contact) => <button key={contact.id} type="button" onClick={() => { setNotificationsOpen(false); navigate(`/hr-manager/inbox/${contact.id}`) }} className="w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50"><div className="flex items-center justify-between gap-3"><p className="truncate text-xs font-bold text-slate-900">{contact.name}</p>{contact.unread > 0 && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">{contact.unread} new</span>}</div><p className="mt-1 truncate text-xs text-slate-500">{contact.lastMessage?.text || 'Open conversation'}</p></button>)}</div> : <p className="px-4 py-6 text-center text-xs text-slate-500">No employee messages yet.</p>
              )}
            </div>
          )}
        </div>

        <button type="button" onClick={() => setAssistantOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50 px-3 text-xs font-bold text-[#0092B8] transition hover:border-cyan-200 hover:bg-cyan-100" aria-label="Open HR AI Assistant" title="HR AI Assistant">
          <Sparkles size={16} /> <span className="hidden xl:inline">HR Assistant</span>
        </button>

        {/* HR Dashboard profile / logout */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((current) => !current)}
            className="group flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 transition-all hover:border-slate-300 hover:bg-slate-50"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <UserRound
                size={17}
                strokeWidth={1.9}
              />
            </div>

            <div className="hidden text-left sm:block">
              <p className="text-[12px] font-bold leading-4 text-slate-900">
                HR Manager
              </p>

              <p className="text-[10px] font-medium leading-4 text-slate-400">
                Administrator
              </p>
            </div>

            <ChevronDown
              size={16}
              strokeWidth={1.8}
              className={`hidden text-slate-400 transition-transform sm:block ${
                profileOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {profileOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+10px)] w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_50px_rgba(15,23,42,0.12)]"
            >
              <div className="px-3 py-3">
                <p className="text-sm font-bold text-slate-900">
                  HR Manager
                </p>

                <p className="mt-0.5 text-xs text-slate-400">
                  Administrator
                </p>
              </div>

              <div className="h-px bg-slate-100" />

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setProfileOpen(false)
                  navigate('/hr-manager/settings')
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <Settings
                  size={17}
                  strokeWidth={1.8}
                />

                <span>Profile & Settings</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut
                  size={17}
                  strokeWidth={1.9}
                />

                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
    <HRAssistant open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </>
  )
}

export default HRTopbar
