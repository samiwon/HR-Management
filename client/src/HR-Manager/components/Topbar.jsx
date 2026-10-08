import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, Lock, CalendarCheck, AlertTriangle, Wallet, MessageSquare, Megaphone, Info } from 'lucide-react'
import HRProfileMenu from './ProfileMenu'
import { useMessaging } from '../../Employer/context/messagingStore'
import { authHeaders } from '../../lib/hrApi'
import { getSocket } from '../../lib/socket'

const READ_KEY = 'hr-notifications-read'

const NOTIF_ICONS = {
  leave: { icon: CalendarCheck, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
  alert: { icon: AlertTriangle, color: 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
  payroll: { icon: Wallet, color: 'bg-gray-100 text-gray-700 dark:bg-[#1c2026] dark:text-gray-200' },
  message: { icon: MessageSquare, color: 'bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400' },
  announcement: { icon: Megaphone, color: 'bg-cyan-50 text-[#0092B8] dark:bg-cyan-950/40 dark:text-cyan-300' },
}

export default function HRTopbar() {
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)
  const navigate = useNavigate()
  const { totalUnread, notifications: msgNotifications, markAllNotificationsReadAndRemove, dismissNotification } = useMessaging()

  const [notifications, setNotifications] = useState([])

  const loadLiveNotifications = React.useCallback(async () => {
    try {
      const [leaveRes, employeeRes] = await Promise.all([
        fetch('/api/hr-manager/leave', {
          headers: authHeaders(),
          cache: 'no-store',
        }).catch(() => null),
        fetch('/api/hr-manager/employees', {
          headers: authHeaders(),
          cache: 'no-store',
        }).catch(() => null),
      ])

      const leaveData = leaveRes?.ok ? await leaveRes.json() : []
      const employeeData = employeeRes?.ok ? await employeeRes.json() : []

      const list = []
      const leaves = Array.isArray(leaveData) ? leaveData : (leaveData?.leaveRequests || [])
      const employees = Array.isArray(employeeData) ? employeeData : (employeeData?.employees || [])

      leaves
        .filter((l) => l.status === 'Pending' || l.approvalStatus === 'Pending')
        .slice(0, 10)
        .forEach((l) => {
          list.push({
            id: `leave-${l.id}`,
            type: 'leave',
            title: `Leave request from ${l.employeeName || l.employee?.name || 'Employee'}`,
            message: `${l.days || 1} days ${l.leaveType || 'Leave'} • ${l.startDate || ''} → ${l.endDate || ''}`,
            time: 'Awaiting approval',
            route: '/hr-manager/leave',
          })
        })

      const missing = employees.filter(
        (e) =>
          !e.isArchived &&
          (e.status === 'Active' || e.employmentStatus === 'Active') &&
          (!e.tin || !e.tin.trim() || !e.bankAccount || !e.bankAccount.trim() || !e.basicSalary || Number(e.basicSalary) <= 0)
      )
      if (missing.length) {
        list.push({
          id: 'data-checks',
          type: 'alert',
          title: 'Statutory data checks',
          message: `${missing.length} active employee${missing.length === 1 ? '' : 's'} missing TIN, bank or salary details`,
          time: 'Needs attention',
          route: '/hr-manager/employees',
        })
      }

      setNotifications(list)
    } catch (err) {
      console.error('Failed to load notifications in Topbar:', err)
    }
  }, [])

  useEffect(() => {
    loadLiveNotifications()

    const interval = setInterval(loadLiveNotifications, 8000)

    const handleCreated = () => {
      loadLiveNotifications()
    }

    window.addEventListener('hr-leave-request-created', handleCreated)
    window.addEventListener('hr-leave-updated', handleCreated)

    const handleStorage = (e) => {
      if (e.key === 'hr-leave-request-created' || e.key === 'hr-leave-updated') {
        loadLiveNotifications()
      }
    }
    window.addEventListener('storage', handleStorage)

    let channel = null
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel('hr-leave-requests')
      channel.onmessage = () => loadLiveNotifications()
    }

    const onSocketEvent = () => loadLiveNotifications()
    const socket = getSocket()
    if (socket) {
      socket.on('hr-leave-request-created', onSocketEvent)
      socket.on('hr-leave-updated', onSocketEvent)
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadLiveNotifications()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      window.removeEventListener('hr-leave-request-created', handleCreated)
      window.removeEventListener('hr-leave-updated', handleCreated)
      window.removeEventListener('storage', handleStorage)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (channel) channel.close()
      if (socket) {
        socket.off('hr-leave-request-created', onSocketEvent)
        socket.off('hr-leave-updated', onSocketEvent)
      }
    }
  }, [loadLiveNotifications])

  const unreadIds = useMemo(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'))
    } catch {
      return new Set()
    }
  }, [])
  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length + (totalUnread > 0 ? msgNotifications.filter((n) => n.unread).length : 0)
  const allNotifications = useMemo(() => [...msgNotifications, ...notifications], [msgNotifications, notifications])

  useEffect(() => {
    const onClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const markAllRead = (e) => {
    e.stopPropagation()
    const all = new Set(notifications.map((n) => n.id))
    setReadIds(all)
    try {
      localStorage.setItem(READ_KEY, JSON.stringify([...all]))
    } catch {
      /* ignore */
    }
    markAllNotificationsReadAndRemove()
  }

  return (
    <header className="h-16 shrink-0 bg-white/90 dark:bg-[#0d1014]/90 backdrop-blur border-b border-gray-200/80 dark:border-[#262b31] hidden lg:flex items-center justify-between px-6 sticky top-0 z-30 shadow-2xs">
      {/* Breadcrumb / Portal Context */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="text-gray-400 dark:text-gray-500">Portal</span>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <span className="text-gray-950 dark:text-gray-100 font-bold">HR Management</span>
          <Lock size={11} className="text-gray-300 dark:text-gray-600" />
        </div>
      </div>

      {/* Right Side: Notifications & Profile Menu */}
      <div className="flex items-center gap-2">
        {/* Messages / Inbox */}
        <button
          onClick={() => navigate('/hr-manager/inbox')}
          className="relative p-2.5 rounded-xl text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#1c2026] transition-colors"
          title="Inbox"
        >
          <MessageSquare size={19} />
          {totalUnread > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#0d1014]" />
          )}
        </button>

        {/* Notifications / Bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative p-2.5 rounded-xl text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#1c2026] transition-colors"
            title="Notifications"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#0d1014]" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#15181d] border border-gray-200 dark:border-[#262b31] rounded-2xl shadow-xl dark:shadow-black/40 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#262b31]">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Notifications</h3>
                <button
                  onClick={markAllRead}
                  className="text-[11px] font-semibold text-gray-950 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                >
                  <Check size={13} /> Mark all read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-[#262b31]">
                {allNotifications.length === 0 && (
                  <p className="px-4 py-8 text-xs text-gray-400 dark:text-gray-500 text-center">You’re all caught up.</p>
                )}
                {allNotifications.map((n) => {
                  const meta = NOTIF_ICONS[n.type] || { icon: Info, color: 'bg-gray-100 text-gray-500 dark:bg-[#1c2026] dark:text-gray-400' }
                  const Icon = meta.icon
                  const unread = (n.type === 'message' || n.type === 'announcement') ? n.unread : !readIds.has(n.id)
                  const goToMessage = () => {
                    if (n.contactId) {
                      navigate(`/hr-manager/inbox/${n.contactId}`)
                      setNotifOpen(false)
                      dismissNotification(n.id)
                    } else if (n.type === 'announcement') {
                      dismissNotification(n.id)
                      setNotifOpen(false)
                    } else {
                      setNotifOpen(false)
                      navigate(n.route || '/hr-manager/dashboard')
                    }
                  }
                  return (
                    <div
                      key={n.id}
                      onClick={goToMessage}
                      className={n.type === 'announcement'
                        ? `mx-3 my-2 flex cursor-pointer items-start gap-3 rounded-2xl border border-cyan-100 bg-white p-3.5 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50/40 dark:border-[#33383f] dark:bg-[#15181d] dark:hover:bg-[#1c2026] ${unread ? 'ring-1 ring-cyan-100 dark:ring-cyan-900' : ''}`
                        : `px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer hover:bg-gray-100/60 dark:hover:bg-[#1c2026] ${unread ? 'bg-gray-50/60 dark:bg-[#1c2026]/40' : ''}`
                      }
                    >
                      <div className={`w-8 h-8 rounded-full ${meta.color} flex items-center justify-center shrink-0`}>
                        <Icon size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{n.title}</p>
                          {unread && <span className="w-1.5 h-1.5 rounded-full bg-gray-950 dark:bg-gray-100 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-snug">{n.message}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{n.time}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="p-2 border-t border-gray-100 dark:border-[#262b31]">
                <button
                  onClick={() => navigate('/hr-manager/inbox')}
                  className="w-full py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1c2026] transition-colors"
                >
                  Open Inbox
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown with theme toggle & logout */}
        <HRProfileMenu />
      </div>
    </header>
  )
}