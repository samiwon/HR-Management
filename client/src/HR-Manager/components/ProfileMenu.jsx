import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, ChevronDown, LayoutDashboard, Sun, Moon } from 'lucide-react'
import { logout } from '../../lib/auth'
import { useTheme } from '../../lib/theme'

function getInitials(name) {
  return (name || 'HR')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 border border-gray-200 dark:bg-[#1c2026] dark:border-[#33383f]">
      <button
        onClick={() => dark && toggleTheme()}
        disabled={!dark}
        className={`flex items-center justify-center gap-1.5 flex-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
          !dark
            ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        }`}
      >
        <Sun size={13} /> Light
      </button>
      <button
        onClick={() => !dark && toggleTheme()}
        disabled={dark}
        className={`flex items-center justify-center gap-1.5 flex-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
          dark ? 'bg-[#3a4149] text-white shadow-sm border border-gray-600' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <Moon size={13} /> Dark
      </button>
    </div>
  )
}

export default function HRProfileMenu({ compact = false }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  const raw = localStorage.getItem('user')
  let user = {
    name: 'HR Administrator',
    email: '',
    role: 'HR_ADMIN',
    company: 'Yanol-HR',
  }

  if (raw) {
    try {
      user = { ...user, ...JSON.parse(raw) }
    } catch {
      // ignore
    }
  }

  const initials = getInitials(user.name)
  const roleLabel = 'HR Manager'

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const close = () => setOpen(false)
  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const menuItemClass =
    'flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-[#1c2026] dark:hover:text-white rounded-lg transition-colors'

  return (
    <div className="relative" ref={ref}>
      {/* Profile Trigger Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 pl-1 pr-2 py-1.5 rounded-xl transition-all cursor-pointer ${
          open ? 'bg-gray-100 dark:bg-[#1c2026]' : 'hover:bg-gray-100 dark:hover:bg-[#1c2026]'
        }`}
        title={user.name}
      >
        <div className="w-8 h-8 rounded-full bg-gray-950 text-white text-xs font-black flex items-center justify-center shadow-xs shrink-0 ring-1 ring-gray-300 dark:ring-gray-700 dark:bg-[#3a4149]">
          {initials}
        </div>
        {!compact && (
          <>
            <div className="hidden md:flex flex-col items-start leading-tight text-left">
              <span className="text-xs font-bold text-gray-950 dark:text-gray-100 truncate max-w-[120px]">
                {user.name}
              </span>
              <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 capitalize truncate max-w-[120px]">
                {roleLabel}
              </span>
            </div>
            <ChevronDown
              size={13}
              className={`text-gray-400 transition-transform duration-200 shrink-0 ${
                open ? 'rotate-180 text-gray-700 dark:text-gray-300' : ''
              }`}
            />
          </>
        )}
      </button>

      {/* Profile Dropdown Menu */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-72 bg-white dark:bg-[#15181d] border border-gray-200 dark:border-[#262b31] rounded-2xl shadow-xl dark:shadow-black/40 z-50 overflow-hidden origin-top-right animate-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-gray-100 dark:border-[#262b31] flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gray-950 text-white text-sm font-black flex items-center justify-center shrink-0 shadow-xs dark:bg-[#3a4149]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-950 dark:text-gray-100 truncate">{user.name}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 px-2 py-0.5 rounded-full shrink-0">
              {roleLabel}
            </span>
          </div>

          {/* Quick links */}
          <div className="p-2 border-b border-gray-100 dark:border-[#262b31]">
            <button onClick={() => { close(); navigate('/hr-manager/dashboard') }} className={`${menuItemClass} w-full`}>
              <LayoutDashboard size={14} className="text-gray-400 shrink-0" /> Dashboard
            </button>
          </div>

          {/* Appearance */}
          <div className="p-3">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 block mb-1.5">
              Appearance
            </span>
            <ThemeToggle />
          </div>

          {/* Log out */}
          <div className="p-2 mt-1 border-t border-gray-100 dark:border-[#262b31]">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-red-50 hover:text-red-600 dark:text-gray-200 dark:hover:bg-red-500/10 dark:hover:text-red-400 rounded-lg transition-colors text-left cursor-pointer"
            >
              <LogOut size={14} className="shrink-0" /> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}