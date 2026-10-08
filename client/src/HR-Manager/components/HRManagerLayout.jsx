import React, { useState, useRef, useLayoutEffect } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  BadgeDollarSign,
  Search,
  Menu,
  X,
  ChevronDown,
  Check,
  MessageSquare,
} from 'lucide-react'
import HRTopbar from './Topbar'
import HRProfileMenu from './ProfileMenu'
import { useMessaging } from '../../Employer/context/messagingStore'

export default function HRManagerLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { totalUnread } = useMessaging()

  const [isHovered, setIsHovered] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showOrgMenu, setShowOrgMenu] = useState(false)

  const collapsed = !isHovered

  const [expandedSections, setExpandedSections] = useState({
    teams: true,
    finance: true,
  })

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  // Sliding active highlight
  const navRef = useRef(null)
  const pillRef = useRef(null)

  useLayoutEffect(() => {
    const nav = navRef.current
    const pill = pillRef.current
    if (!nav || !pill) return
    const activeEl = nav.querySelector('[data-nav-active="true"]')
    if (!activeEl) {
      pill.style.opacity = '0'
      return
    }
    pill.style.opacity = '1'
    pill.style.top = `${activeEl.offsetTop}px`
    pill.style.height = `${activeEl.offsetHeight}px`
  }, [location.pathname, expandedSections, mobileOpen])

  const [currentOrg, setCurrentOrg] = useState({
    name: 'Yanol Technology PLC',
    members: 'HR Manager',
    code: 'YT',
  })

  React.useEffect(() => {
    let active = true
    const token = localStorage.getItem('token')
    if (token) {
      fetch('http://localhost:4000/api/hr-manager/settings', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (!active) return
          const name = data?.companyInformation?.companyName
          if (name) {
            const words = name.trim().split(/\s+/)
            const code = words.map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'YT'
            setCurrentOrg({ name, members: 'HR Manager', code })
          }
        })
        .catch(() => {})
    }
    return () => { active = false }
  }, [])

  const organizations = [
    currentOrg,
  ]

  const isRouteActive = (path) => {
    if (path === '/hr-manager/dashboard') {
      return (
        location.pathname === '/hr-manager/dashboard' ||
        location.pathname === '/hr-manager' ||
        location.pathname === '/hr-manager/'
      )
    }
    return location.pathname === path || location.pathname.startsWith(path)
  }

  return (
    <div className="h-screen overflow-hidden bg-[#f4f5f7] dark:bg-[#0a0d10] text-gray-800 dark:text-gray-200 flex flex-col antialiased">
      {/* Mobile Top Navigation Header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-[#0d1014] border-b border-gray-200 dark:border-[#262b31] sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1c2026] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 3.2L18 9l-6 3.8L6 9l6-3.8zm-6.5 5.5l5.5 3.5v7.2L5.5 18v-7.3zm13 0v7.3l-5.5 3.5v-7.2l5.5-3.6z" />
              </svg>
            </div>
            <span className="font-bold tracking-tight text-gray-950 dark:text-gray-100 text-sm">Yanol-HR</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/hr-manager/inbox"
            className="relative p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1c2026] transition-colors"
            aria-label="Inbox"
          >
            <MessageSquare size={18} />
            {totalUnread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gray-500" />
            )}
          </Link>
          <HRProfileMenu compact />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar with Hover Collapse/Expand Resizing */}
        <aside
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`
            fixed lg:static inset-y-0 left-0 z-50 bg-white dark:bg-[#0d1014] border-r border-gray-200/80 dark:border-gray-800
            flex flex-col shrink-0 transition-all duration-300 ease-in-out select-none
            ${collapsed ? 'lg:w-[72px]' : 'lg:w-[250px]'}
            ${mobileOpen ? 'translate-x-0 w-[260px] shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          {/* Logo & Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 shrink-0">
            <div
              className={`flex items-center gap-2.5 overflow-hidden transition-all duration-200 ${
                collapsed ? 'justify-center w-full' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-black dark:bg-[#3a4149] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 3.2L18 9l-6 3.8L6 9l6-3.8zm-6.5 5.5l5.5 3.5v7.2L5.5 18v-7.3zm13 0v7.3l-5.5 3.5v-7.2l5.5-3.6z" />
                </svg>
              </div>
              {!collapsed && (
                <div className="truncate">
                  <span className="font-extrabold tracking-tight text-gray-950 dark:text-gray-100 text-sm font-sans block truncate">
                    Yanol-HR
                  </span>
                  <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 block -mt-0.5 truncate">
                    HR Management
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Search */}
          {!collapsed ? (
            <div className="px-3 pt-3 pb-1 shrink-0">
              <div className="relative flex items-center">
                <Search size={15} className="absolute left-3 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-12 py-1.5 bg-gray-50/80 hover:bg-gray-100/80 focus:bg-white dark:bg-[#0a0d10] dark:hover:bg-[#15181d] dark:focus:bg-[#0a0d10] text-xs text-gray-800 dark:text-gray-200 rounded-lg border border-gray-200/70 dark:border-[#262b31] focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition-all placeholder:text-gray-400"
                />
                <span className="absolute right-2 text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-white dark:bg-[#1c2026] px-1.5 py-0.5 rounded border border-gray-200 dark:border-[#262b31] shadow-2xs">
                  ⌘ K
                </span>
              </div>
            </div>
          ) : (
            <div className="px-3 pt-3 flex justify-center shrink-0">
              <div className="p-2 text-gray-400 rounded-lg" title="Hover to expand">
                <Search size={16} />
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div ref={navRef} className="relative px-3 py-2 space-y-1.5 text-sm">
              {/* Sliding active highlight pill */}
              <div
                ref={pillRef}
                className="pointer-events-none absolute left-3 right-3 top-0 h-9 rounded-lg bg-gray-100 dark:bg-[#1c2026] border-l-2 border-gray-950 dark:border-gray-100 opacity-0 z-0 transition-[top,height,opacity] duration-300 ease-out"
              />

              {/* Dashboard */}
              <Link
                to="/hr-manager/dashboard"
                data-nav-active={isRouteActive('/hr-manager/dashboard') ? 'true' : undefined}
                className={`relative z-10 flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  isRouteActive('/hr-manager/dashboard')
                    ? 'text-gray-950 font-semibold dark:text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-[#1c2026]'
                }`}
                title={collapsed ? 'Dashboard' : undefined}
              >
                <LayoutDashboard size={16} className="shrink-0 text-gray-500" />
                {!collapsed && <span>Dashboard</span>}
              </Link>

              {/* Teams Section (Expandable) */}
              <div className="pt-1">
                <button
                  onClick={() => !collapsed && toggleSection('teams')}
                  className={`relative z-10 w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1c2026] transition-colors whitespace-nowrap ${
                    collapsed ? 'justify-center' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users size={16} className="shrink-0 text-gray-500" />
                    {!collapsed && <span className="font-semibold text-gray-900 dark:text-gray-100">Teams</span>}
                  </div>
                  {!collapsed && (
                    <ChevronDown
                      size={14}
                      className={`text-gray-400 transition-transform duration-200 ${
                        expandedSections.teams ? '' : '-rotate-90'
                      }`}
                    />
                  )}
                </button>

                {(!collapsed && expandedSections.teams) && (
                  <div className="pl-4 pr-1 mt-0.5 space-y-0.5 whitespace-nowrap">
                    <Link
                      to="/hr-manager/employees"
                      data-nav-active={isRouteActive('/hr-manager/employee') ? 'true' : undefined}
                      className={`relative z-10 flex items-center px-3 py-1.5 text-xs rounded-md font-medium transition-colors group ${
                        isRouteActive('/hr-manager/employee')
                          ? 'text-gray-950 dark:text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#1c2026]'
                      }`}
                    >
                      <span className="ml-1">Employee</span>
                    </Link>
                    <Link
                      to="/hr-manager/attendance"
                      data-nav-active={isRouteActive('/hr-manager/attendance') ? 'true' : undefined}
                      className={`relative z-10 flex items-center px-4 py-1.5 text-xs rounded-md transition-colors ${
                        isRouteActive('/hr-manager/attendance')
                          ? 'text-gray-950 dark:text-white font-semibold'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#1c2026]'
                      }`}
                    >
                      Attendance
                    </Link>
                    <Link
                      to="/hr-manager/leave"
                      data-nav-active={isRouteActive('/hr-manager/leave') ? 'true' : undefined}
                      className={`relative z-10 flex items-center px-4 py-1.5 text-xs rounded-md transition-colors ${
                        isRouteActive('/hr-manager/leave')
                          ? 'text-gray-950 dark:text-white font-semibold'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#1c2026]'
                      }`}
                    >
                      Leave
                    </Link>
                  </div>
                )}
              </div>

              {/* Finance Section (Expandable) */}
              <div className="pt-1">
                <button
                  onClick={() => !collapsed && toggleSection('finance')}
                  className={`relative z-10 w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1c2026] transition-colors whitespace-nowrap ${
                    collapsed ? 'justify-center' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <BadgeDollarSign size={16} className="shrink-0 text-gray-500" />
                    {!collapsed && <span className="font-semibold text-gray-900 dark:text-gray-100">Finance</span>}
                  </div>
                  {!collapsed && (
                    <ChevronDown
                      size={14}
                      className={`text-gray-400 transition-transform duration-200 ${
                        expandedSections.finance ? '' : '-rotate-90'
                      }`}
                    />
                  )}
                </button>

                {(!collapsed && expandedSections.finance) && (
                  <div className="pl-4 pr-1 mt-0.5 space-y-0.5 whitespace-nowrap">
                    <Link
                      to="/hr-manager/payroll"
                      data-nav-active={isRouteActive('/hr-manager/payroll') ? 'true' : undefined}
                      className={`relative z-10 flex items-center px-4 py-1.5 text-xs rounded-md transition-colors ${
                        isRouteActive('/hr-manager/payroll')
                          ? 'text-gray-950 dark:text-white font-semibold'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#1c2026]'
                      }`}
                    >
                      Payroll
                    </Link>
                    <Link
                      to="/hr-manager/reports"
                      data-nav-active={isRouteActive('/hr-manager/reports') ? 'true' : undefined}
                      className={`relative z-10 flex items-center px-4 py-1.5 text-xs rounded-md transition-colors ${
                        isRouteActive('/hr-manager/reports')
                          ? 'text-gray-950 dark:text-white font-semibold'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#1c2026]'
                      }`}
                    >
                      Reports
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Organization Card */}
          <div className="p-3 border-t border-gray-100 dark:border-gray-800 relative shrink-0">
            <button
              onClick={() => !collapsed && setShowOrgMenu(!showOrgMenu)}
              className={`w-full flex items-center justify-between p-2 rounded-xl bg-gray-100/90 hover:bg-gray-200/70 dark:bg-[#15181d] dark:hover:bg-[#1c2026] border border-gray-200/60 dark:border-[#262b31] transition-colors text-left cursor-pointer ${
                collapsed ? 'justify-center p-1.5' : ''
              }`}
              title={collapsed ? currentOrg.name : undefined}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-gray-950 dark:bg-[#3a4149] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                  {currentOrg.code}
                </div>
                {!collapsed && (
                  <div className="truncate">
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{currentOrg.name}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{currentOrg.members}</p>
                  </div>
                )}
              </div>
              {!collapsed && <ChevronDown size={14} className="text-gray-500 shrink-0 ml-1" />}
            </button>

            {/* Org Switcher Dropdown */}
            {showOrgMenu && !collapsed && (
              <div className="absolute bottom-16 left-3 right-3 bg-white dark:bg-[#15181d] rounded-xl shadow-xl dark:shadow-black/40 border border-gray-200/90 dark:border-[#262b31] p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 px-2.5 py-1">
                  Workspace
                </p>
                {organizations.map((org) => (
                  <button
                    key={org.name}
                    onClick={() => {
                      setCurrentOrg(org)
                      setShowOrgMenu(false)
                      if (org.code === 'YT') {
                        navigate('/employer/dashboard')
                      }
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                      org.name === currentOrg.name
                        ? 'bg-gray-100 text-gray-950 font-semibold dark:bg-[#1c2026] dark:text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1c2026]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-6 h-6 rounded-full bg-gray-950 dark:bg-[#3a4149] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {org.code}
                      </div>
                      <span className="truncate">{org.name}</span>
                    </div>
                    {org.name === currentOrg.name && <Check size={14} className="text-gray-900 dark:text-white shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main Workspace Area */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-[#f4f5f7] dark:bg-[#0a0d10] scroll-smooth">
          <HRTopbar />
          <Outlet />
        </main>
      </div>
    </div>
  )
}