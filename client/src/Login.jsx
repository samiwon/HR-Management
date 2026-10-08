import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  Mail,
  Building,
  Users,
  Plus,
  MessageSquare,
  Bell,
  Send,
  Wallet,
  UserCheck,
  CalendarCheck,
  CheckCheck,
  Paperclip,
  ChevronDown,
  MoreHorizontal,
  KeyRound,
  Loader2,
} from 'lucide-react'

const SLIDES = [
  {
    id: 'dashboard',
    title: 'Executive Employer Dashboard',
    description: 'Real-time workforce intelligence, live attendance tracking, department distribution, and automated alerts.',
    type: 'dashboard',
  },
  {
    id: 'chat',
    title: 'Team Pulse & Real-Time Chat',
    description: 'Live interactive team activity stream with step-by-step chat popups, team pulse, and instant sync.',
    type: 'chat',
  },
  {
    id: 'report',
    title: 'Workforce & Risk Reporting Dashboard',
    description: 'Executive compliance intelligence, average vendor rating arc, risk trajectory curves, and severity distribution.',
    type: 'report',
  },
]

/* ─────────────── Constant Header for All 3 Slides with Site Logo ─────────────── */
function SlideHeader() {
  return (
    <div className="px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-gray-50/90 via-white to-gray-50/90 flex items-center justify-between shrink-0 h-[64px]">
      <div className="flex items-center gap-3">
        {/* Site Logo */}
        <img src="/logo.png" alt="Yanol-HR" className="h-8 w-8 rounded-xl object-contain shadow-xs shrink-0" />
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm text-gray-950 tracking-tight">Yanol-HR</h3>
            <span className="text-[10px] text-gray-300 font-bold">/</span>
            <span className="text-[11px] font-semibold text-gray-700">Wishbone Global</span>
          </div>
          <p className="text-[10px] text-gray-500">Enterprise HR & Payroll • September 2026</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 shadow-2xs">
          <Bell size={13} />
        </span>
        <button
          type="button"
          className="text-[10px] font-bold text-white bg-gray-950 hover:bg-gray-800 px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
        >
          <Plus size={11} />
          <span>Add Member</span>
        </button>
      </div>
    </div>
  )
}

const ROSTER_EMPLOYEES = [
  { name: 'Randy Rhiel Madsen', role: 'UI Lead', id: 'A01DSGN193', status: 'Active', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80' },
  { name: 'Maria Rosser', role: 'UX Research', id: 'A02DSGN196', status: 'Active', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80' },
  { name: 'Cheyenne Bothman', role: 'Senior iOS', id: 'A04ENGR202', status: 'On Leave', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80' },
  { name: 'Abebe Bikila', role: 'Backend Lead', id: 'A05ENGR210', status: 'Active', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80' },
  { name: 'Bethlehem Tadesse', role: 'Talent Lead', id: 'A06HRES215', status: 'Active', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80' },
  { name: 'Dawit Mengistu', role: 'Financial Analyst', id: 'A07FINC220', status: 'Active', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80' },
  { name: 'Selamawit Haile', role: 'Product Manager', id: 'A08PROD225', status: 'Active', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80' },
  { name: 'Yared Tesfaye', role: 'DevOps Engineer', id: 'A09ENGR230', status: 'On Leave', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80' },
]

/* ─────────────── Slide 1: Employer Dashboard ─────────────── */
function DashboardSlide() {
  const kpis = [
    { label: 'Total Headcount', value: '24', trend: '+3 this mo', color: 'from-blue-500/10 to-indigo-500/10 text-indigo-700 border-indigo-200/70', icon: Users },
    { label: 'Active Staff', value: '18', trend: '75% capacity', color: 'from-emerald-500/10 to-teal-500/10 text-emerald-700 border-emerald-200/70', icon: UserCheck },
    { label: 'On Leave', value: '3', trend: '2 returning', color: 'from-amber-500/10 to-orange-500/10 text-amber-700 border-amber-200/70', icon: CalendarCheck },
    { label: 'Gross Payroll', value: '284.9K', unit: 'ETB', trend: '+4.2%', color: 'from-violet-500/10 to-purple-500/10 text-violet-700 border-violet-200/70', icon: Wallet },
  ]

  const depts = [
    { name: 'Engineering', count: 9, pct: '38%', bar: 'bg-indigo-600' },
    { name: 'Product & Design', count: 5, pct: '21%', bar: 'bg-cyan-500' },
    { name: 'Finance & Legal', count: 4, pct: '17%', bar: 'bg-violet-500' },
    { name: 'Operations & HR', count: 6, pct: '24%', bar: 'bg-emerald-500' },
  ]

  return (
    <div className="w-full max-w-[590px] h-[540px] bg-white text-gray-950 rounded-2xl shadow-2xl border border-gray-200/90 flex flex-col justify-between overflow-hidden">
      {/* Constant Top Header with Site Logo */}
      <SlideHeader />

      {/* Sub-bar with overview info */}
      <div className="px-5 py-2 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-gray-900">Workforce & Headcount Directory</span>
          <span className="text-[10px] text-gray-300">•</span>
          <span className="text-[10px] text-gray-500 font-medium">24 Profiles Active</span>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5 overflow-hidden">
        {/* 4 KPI Cards with larger height */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpis.map((k) => (
            <div
              key={k.label}
              className={`p-3.5 h-[116px] rounded-xl border bg-gradient-to-b ${k.color} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xs flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between">
                <div className="w-7 h-7 rounded-lg bg-white/90 backdrop-blur-xs flex items-center justify-center shadow-2xs">
                  <k.icon size={15} />
                </div>
                <span className="text-[9px] font-bold text-gray-700 bg-white/85 px-1.5 py-0.5 rounded-md shadow-2xs">
                  {k.trend}
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-black text-gray-950 tracking-tight">{k.value}</p>
                  {k.unit && <span className="text-xs font-bold text-gray-500">{k.unit}</span>}
                </div>
                <p className="text-[10px] font-medium text-gray-600 mt-0.5">{k.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Department Distribution with larger height */}
        <div className="p-3.5 rounded-xl bg-gray-50/90 border border-gray-200/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-900 flex items-center gap-1.5">
              <Users size={14} className="text-gray-900" />
              Department Roster & Headcount
            </span>
            <span className="text-[10px] font-semibold text-gray-500">100% Assigned</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {depts.map((d) => (
              <div key={d.name} className="p-2.5 h-[52px] rounded-lg bg-white border border-gray-200/70 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[9px]">
                  <span className="font-semibold text-gray-700 truncate">{d.name}</span>
                  <span className="font-bold text-gray-950">{d.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full rounded-full ${d.bar}`} style={{ width: d.pct }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Staff Roster Preview with Auto-Scrolling Animation */}
        <div className="border border-gray-200/80 rounded-xl overflow-hidden bg-white">
          <div className="px-3.5 py-2 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between text-[10px] font-bold text-gray-600">
            <span>Recent Employees</span>
            <span>Status</span>
          </div>
          <div className="relative h-[120px] overflow-hidden">
            {/* Gradient masks for smooth top/bottom edge transition */}
            <div className="absolute top-0 inset-x-0 h-3 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />
            <div className="absolute bottom-0 inset-x-0 h-3 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />

            <div className="animate-scroll-roster divide-y divide-gray-100">
              {[...ROSTER_EMPLOYEES, ...ROSTER_EMPLOYEES].map((emp, idx) => (
                <div key={`${emp.id}-${idx}`} className="px-3.5 py-2 flex items-center justify-between hover:bg-gray-50/60 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src={emp.avatar} alt={emp.name} className="w-7 h-7 rounded-full object-cover ring-1 ring-gray-200 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-gray-950 leading-tight truncate">{emp.name}</p>
                      <p className="text-[9px] text-gray-500 leading-tight truncate">{emp.role} • <span className="font-mono">{emp.id}</span></p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                    emp.status === 'Active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {emp.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bar */}
      <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-center shrink-0">
        <span className="font-mono text-[11px] font-semibold tracking-wider text-gray-700 uppercase">
          Ethiopian Tax & Pension Compliant
        </span>
      </div>
    </div>
  )
}

/* ─────────────── Slide 2: Team Chat & Live Popups ─────────────── */
const CHAT_MESSAGES = [
  {
    id: 1,
    name: 'Randy Rhiel Madsen',
    role: 'Lead UI Designer',
    roleBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    time: 'Just now',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    channel: '#design-tokens',
    message: 'Pushed 6 new responsive components for Sprint 14. Ready for review in Figma.',
    isMe: false,
  },
  {
    id: 2,
    name: 'Alex Johnson',
    role: 'Employer / Admin',
    roleBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    time: '1m ago',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    channel: '#sprint-review',
    message: 'Superb work @Randy! Payroll & sprint performance bonuses are approved for Friday.',
    isMe: true,
    whiteBubble: true,
  },
  {
    id: 3,
    name: 'Cheyenne Bothman',
    role: 'Senior iOS Dev',
    roleBadge: 'bg-sky-50 text-sky-700 border-sky-200/80',
    time: '3m ago',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
    channel: '#ios-sprint',
    message: 'PR #184 merged: Offline attendance sync verified on staging. Zero packet drops.',
    isMe: false,
  },
]

function ChatSlide({ chatStep }) {
  return (
    <div className="w-full max-w-[590px] h-[540px] bg-white text-gray-950 rounded-2xl shadow-2xl border border-gray-200/90 flex flex-col justify-between overflow-hidden">
      {/* Constant Top Header with Site Logo */}
      <SlideHeader />

      {/* Sub-bar with channel info & active members */}
      <div className="px-5 py-2 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-gray-900">#team-collaboration</span>
          <span className="text-[10px] text-gray-300">•</span>
          <span className="text-[10px] text-gray-500 font-medium">4 team members active</span>
        </div>
        <div className="flex items-center -space-x-1.5">
          {CHAT_MESSAGES.map((m) => (
            <img
              key={m.id}
              src={m.avatar}
              alt={m.name}
              className="w-5 h-5 rounded-full ring-1 ring-white object-cover shadow-2xs"
            />
          ))}
          <span className="w-5 h-5 rounded-full bg-gray-900 text-white text-[8px] font-bold ring-1 ring-white flex items-center justify-center shadow-2xs">
            +5
          </span>
        </div>
      </div>

      {/* Chat Messages Body with spring-bounce animation & comfortable spacing */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-start space-y-3.5 overflow-hidden">
        {CHAT_MESSAGES.map((msg, i) => {
          const visible = chatStep > i
          return (
            <div
              key={msg.id}
              style={{
                transform: visible ? 'scale(1) translateY(0)' : 'scale(0.88) translateY(20px)',
                opacity: visible ? 1 : 0,
                transition: 'all 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              className={`flex items-start gap-3 w-full ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar with online status */}
              <div className="relative shrink-0 mt-0.5">
                <img
                  src={msg.avatar}
                  alt={msg.name}
                  className="w-8 h-8 rounded-xl object-cover shadow-xs ring-1 ring-gray-200/80"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>

              {/* Bubble Body */}
              <div className={`flex flex-col max-w-[80%] ${msg.isMe ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-center gap-1.5 mb-1 ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span className="text-[11px] font-extrabold text-gray-950">{msg.name}</span>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md border ${msg.roleBadge}`}>
                    {msg.role}
                  </span>
                  <span className="text-[9px] text-gray-400">{msg.time}</span>
                </div>

                <div
                  className={`relative px-4 py-2.5 rounded-2xl text-[11px] leading-relaxed shadow-sm ${
                    msg.isMe
                      ? msg.whiteBubble
                        ? 'bg-white text-gray-800 border border-gray-200/90 rounded-tr-xs shadow-gray-100'
                        : 'bg-gradient-to-r from-gray-950 via-indigo-950 to-gray-950 text-white rounded-tr-xs shadow-indigo-950/20'
                      : 'bg-white text-gray-800 border border-gray-200/90 rounded-tl-xs shadow-gray-100'
                  }`}
                >
                  <p>{msg.message}</p>
                </div>

                {msg.isMe && (
                  <div className="flex items-center gap-1 text-[8px] text-gray-400 mt-0.5 font-medium">
                    <CheckCheck size={10} className="text-indigo-500" />
                    <span>Delivered & Read</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Live Typing Status */}
        {chatStep >= 4 && (
          <div
            style={{
              transition: 'all 0.4s ease-out',
              transform: 'scale(1) translateY(0)',
              opacity: 1,
            }}
            className="flex items-center gap-2 px-2 py-1 text-[10px] text-gray-500"
          >
            <div className="flex items-center gap-1 bg-gray-100/90 px-2.5 py-1 rounded-full border border-gray-200/60 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-300" />
            </div>
            <span className="font-medium italic text-gray-500">Sarah Jenkins is replying…</span>
          </div>
        )}
      </div>

      {/* Mock Chat Input & Footer */}
      <div className="p-3 bg-gray-50 border-t border-gray-100 shrink-0 space-y-2">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-2xs">
          <Paperclip size={13} className="text-gray-400" />
          <span className="flex-1 text-[10px] text-gray-400 font-normal">Message #team-collaboration…</span>
          <button className="w-6 h-6 rounded-lg bg-gray-950 flex items-center justify-center text-white shadow-xs">
            <Send size={10} />
          </button>
        </div>
        <div className="flex items-center justify-center px-1">
          <span className="font-mono text-[11px] font-semibold tracking-wider text-gray-700 uppercase">
            38 Team Messages Synced
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─────────────── Slide 3: Executive Risk & Reporting Dashboard (Matching report.png) ─────────────── */
function ReportSlide() {
  return (
    <div className="w-full max-w-[590px] h-[540px] bg-white text-gray-950 rounded-2xl shadow-2xl border border-gray-200/90 flex flex-col justify-between overflow-hidden">
      {/* Constant Top Header with Site Logo */}
      <SlideHeader />

      {/* Sub-bar matching report.png with site color scheme */}
      <div className="px-5 py-2.5 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between shrink-0">
        <span className="text-[11px] font-bold text-gray-900">Workforce & Risk Reporting</span>
        <div className="flex items-center gap-1 bg-white border border-gray-200 p-0.5 rounded-lg shadow-2xs">
          <span className="px-2 py-0.5 text-[9px] font-medium text-gray-500 cursor-pointer hover:text-gray-900 transition-colors">1 month</span>
          <span className="px-2 py-0.5 text-[9px] font-medium text-gray-500 cursor-pointer hover:text-gray-900 transition-colors">3 months</span>
          <span className="px-2.5 py-0.5 text-[9px] font-bold text-white bg-black rounded-md shadow-xs">1 year</span>
        </div>
      </div>

      {/* 2x2 Grid Matching report.png in site monochrome theme */}
      <div className="flex-1 grid grid-cols-2 divide-x divide-y divide-gray-100/90 overflow-hidden">
        {/* Quadrant 1 (Top Left): Average vendor rating */}
        <div className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-700">Average vendor rating</span>
            <MoreHorizontal size={13} className="text-gray-400 cursor-pointer" />
          </div>
          <div className="flex flex-col items-center justify-center my-auto py-1">
            <div className="relative w-36 h-22 flex items-end justify-center">
              <svg className="w-36 h-22 overflow-visible" viewBox="0 0 120 68">
                {/* Background muted gray arc */}
                <path
                  d="M 16 64 A 44 44 0 0 1 104 64"
                  fill="none"
                  stroke="#f4f4f5"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Active black arc */}
                <path
                  d="M 16 64 A 44 44 0 0 1 98 38"
                  fill="none"
                  stroke="#09090b"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center">
                <span className="text-3xl font-black text-gray-950 tracking-tight">820</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quadrant 2 (Top Right): Your risk rating over time */}
        <div className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-700">Your risk rating over time</span>
            <MoreHorizontal size={13} className="text-gray-400 cursor-pointer" />
          </div>
          <div className="flex flex-col justify-end h-full pt-1 pb-0.5">
            <div className="h-20 w-full relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 200 55" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#09090b" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#09090b" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 35 C 30 35, 60 18, 100 18 C 140 18, 160 38, 200 24 L 200 55 L 0 55 Z"
                  fill="url(#waveGrad)"
                />
                <path
                  d="M 0 35 C 30 35, 60 18, 100 18 C 140 18, 160 38, 200 24"
                  fill="none"
                  stroke="#09090b"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="flex justify-between px-0.5 text-[7px] text-gray-400 font-mono mt-1">
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Quadrant 3 (Bottom Left): Risk severity breakdown */}
        <div className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-gray-700">Risk severity breakdown</span>
            <MoreHorizontal size={13} className="text-gray-400 cursor-pointer" />
          </div>
          <div className="space-y-2 py-0.5">
            {[
              { label: 'Critical', count: '2 issues', dot: 'bg-black text-white' },
              { label: 'High', count: '3 issues', dot: 'bg-gray-800 text-white' },
              { label: 'Medium', count: '5 issues', dot: 'bg-gray-500 text-white' },
              { label: 'Low', count: '3 issues', dot: 'bg-gray-300 text-gray-800' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-[9px] py-0.5">
                <div className="flex items-center gap-2">
                  <span className={`w-3.5 h-3.5 rounded-full ${item.dot} flex items-center justify-center text-[7px] font-bold`}>
                    •
                  </span>
                  <span className="font-medium text-gray-800">{item.label}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <span className="text-[8px] font-medium">{item.count}</span>
                  <ChevronDown size={10} className="text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quadrant 4 (Bottom Right): Risk severity over time */}
        <div className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-gray-700">Risk severity over time</span>
            <MoreHorizontal size={13} className="text-gray-400 cursor-pointer" />
          </div>
          <div className="relative flex flex-col justify-end h-full pt-1 pb-0.5">
            <div className="flex items-end gap-1 h-20 px-1 relative">
              {/* Overlaid line with dots in site monochrome */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible" viewBox="0 0 180 50" preserveAspectRatio="none">
                <path
                  d="M 8 16 L 24 22 L 40 25 L 56 24 L 72 23 L 88 30 L 104 30 L 120 26 L 136 32 L 152 34 L 168 36"
                  fill="none"
                  stroke="#09090b"
                  strokeWidth="1.5"
                />
                {[
                  [8, 16], [24, 22], [40, 25], [56, 24], [72, 23],
                  [88, 30], [104, 30], [120, 26], [136, 32], [152, 34], [168, 36]
                ].map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r="2" fill="#09090b" />
                ))}
              </svg>

              {/* Stacked bars with shades of monochrome black & gray */}
              {[
                { h: [15, 12, 10, 8] },
                { h: [13, 11, 9, 7] },
                { h: [12, 10, 8, 6] },
                { h: [11, 9, 7, 5] },
                { h: [10, 8, 6, 5] },
                { h: [9, 7, 5, 4] },
                { h: [8, 6, 5, 4] },
                { h: [7, 5, 4, 3] },
                { h: [6, 5, 4, 3] },
                { h: [5, 4, 3, 3] },
                { h: [4, 3, 3, 2] },
                { h: [3, 2, 2, 2] },
              ].map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col justify-end h-full gap-0.5 z-0">
                  <div className="w-full bg-gray-200 rounded-t-xs" style={{ height: `${bar.h[3] * 1.5}px` }} />
                  <div className="w-full bg-gray-400" style={{ height: `${bar.h[2] * 1.5}px` }} />
                  <div className="w-full bg-gray-700" style={{ height: `${bar.h[1] * 1.5}px` }} />
                  <div className="w-full bg-black rounded-b-xs" style={{ height: `${bar.h[0] * 1.5}px` }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between px-0.5 text-[7px] text-gray-400 font-mono mt-1">
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bar */}
      <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-center shrink-0">
        <span className="font-mono text-[11px] font-semibold tracking-wider text-gray-700 uppercase">
          Workforce Risk & Compliance Audit
        </span>
      </div>
    </div>
  )
}

/* ─────────────── Main Login Component ─────────────── */
function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState('EMPLOYER')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentSlide, setCurrentSlide] = useState(0)
  const [chatStep, setChatStep] = useState(0)
  const [showForcedPasswordChange, setShowForcedPasswordChange] = useState(false)
  const [forcedCurrentPassword, setForcedCurrentPassword] = useState('')
  const [forcedNewPassword, setForcedNewPassword] = useState('')
  const [forcedConfirmPassword, setForcedConfirmPassword] = useState('')
  const [forcedPasswordError, setForcedPasswordError] = useState('')
  const [forcedPasswordSaving, setForcedPasswordSaving] = useState(false)

  // Auto-advance slides every 6.5s
  useEffect(() => {
    const t = setInterval(() => setCurrentSlide((p) => (p + 1) % SLIDES.length), 6500)
    return () => clearInterval(t)
  }, [])

  // Staggered chat animation steps
  useEffect(() => {
    if (currentSlide === 1) {
      setChatStep(0)
      const t1 = setTimeout(() => setChatStep(1), 300)
      const t2 = setTimeout(() => setChatStep(2), 1100)
      const t3 = setTimeout(() => setChatStep(3), 1900)
      const t4 = setTimeout(() => setChatStep(4), 2800)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
        clearTimeout(t4)
      }
    }
  }, [currentSlide])

 const handleSubmit = async (e) => {
  e.preventDefault()
  setError('')
  setLoading(true)

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim(),
        password,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data?.message || 'Invalid email or password')
    }

  const user = {
  ...data,
  company: 'Wishbone',
}

    localStorage.setItem('user', JSON.stringify(user))

    setLoading(false)

    const normalizedRole = String(data.role || '').trim().toUpperCase()

    if (normalizedRole === 'HR_MANAGER' || normalizedRole === 'HR' || normalizedRole === 'ADMIN' || normalizedRole === 'HR_ADMIN') {
      navigate('/hr-manager')
    } else if (normalizedRole === 'EMPLOYEE' || normalizedRole === 'EMPLOYER') {
      if (data.mustChangePassword) {
        setForcedCurrentPassword(password)
        setForcedNewPassword('')
        setForcedConfirmPassword('')
        setForcedPasswordError('')
        setShowForcedPasswordChange(true)
      } else {
        navigate('/employer/dashboard')
      }
    } else {
      navigate('/employer/dashboard')
    }
  } catch (err) {
    console.error('Login error:', err)

    setError(err.message || 'Unable to sign in.')
    setLoading(false)
  }
}

  const handleForcedPasswordChange = async (e) => {
    e.preventDefault()
    setForcedPasswordError('')

    if (forcedNewPassword.length < 8) {
      setForcedPasswordError('New password must be at least 8 characters.')
      return
    }

    if (forcedNewPassword === forcedCurrentPassword) {
      setForcedPasswordError('New password must be different from the temporary password.')
      return
    }

    if (forcedNewPassword !== forcedConfirmPassword) {
      setForcedPasswordError('New passwords do not match.')
      return
    }

    setForcedPasswordSaving(true)

    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')

      const response = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${storedUser.token || ''}`,
        },
        body: JSON.stringify({
          currentPassword: forcedCurrentPassword,
          newPassword: forcedNewPassword,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data?.message || 'Could not update password.')
      }

      const updatedUser = {
        ...storedUser,
        mustChangePassword: false,
      }

      localStorage.setItem('user', JSON.stringify(updatedUser))
      setShowForcedPasswordChange(false)
      setForcedCurrentPassword('')
      setForcedNewPassword('')
      setForcedConfirmPassword('')
      setForcedPasswordError('')
      navigate('/employer/dashboard')
    } catch (err) {
      setForcedPasswordError(err.message || 'Could not update password.')
    } finally {
      setForcedPasswordSaving(false)
    }
  }

  const activeIdx = currentSlide % SLIDES.length
  const activeSlide = SLIDES[activeIdx]

  return (
    <>
      {showForcedPasswordChange && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
                <KeyRound size={19} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-950">Create your password</h2>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  This is your first login. Your temporary password must be replaced before you can continue.
                </p>
              </div>
            </div>

            <form onSubmit={handleForcedPasswordChange} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Temporary Password</label>
                <input
                  type="password"
                  value={forcedCurrentPassword}
                  onChange={(e) => setForcedCurrentPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">New Password</label>
                <input
                  type="password"
                  value={forcedNewPassword}
                  onChange={(e) => setForcedNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Confirm New Password</label>
                <input
                  type="password"
                  value={forcedConfirmPassword}
                  onChange={(e) => setForcedConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>

              {forcedPasswordError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
                  {forcedPasswordError}
                </div>
              )}

              <button
                type="submit"
                disabled={forcedPasswordSaving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {forcedPasswordSaving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                {forcedPasswordSaving ? 'Updating password...' : 'Set New Password & Continue'}
              </button>
            </form>
          </div>
        </div>
      )}

    <div className="min-h-screen bg-white text-gray-900 flex flex-col lg:flex-row antialiased font-sans selection:bg-black selection:text-white">
      {/* ── LEFT COLUMN: 50% Clean Login Form ── */}
      <div className="w-full lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-between min-h-screen bg-white">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Yanol-HR" className="h-8 w-8 rounded-xl object-contain shadow-xs" />
          <span className="font-extrabold tracking-tight text-gray-950 text-base">Yanol-HR</span>
        </div>

        {/* Center Form */}
        <div className="max-w-[360px] w-full mx-auto my-auto py-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900 mb-2">Log in</h1>
            <p className="text-sm text-gray-500">Welcome back! Please enter your details.</p>
          </div>

          {/* Role Tabs */}
          <div className="mb-6 p-1 bg-gray-100/90 rounded-xl border border-gray-200/80 grid grid-cols-2 gap-1.5">
            {[
              { role: 'EMPLOYER', icon: Building, label: 'Employee / Staff' },
              { role: 'HR_MANAGER', icon: Users, label: 'HR Manager' },
            ].map(({ role, icon: Icon, label }) => (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  selectedRole === role
                    ? 'bg-white text-gray-950 shadow-xs font-semibold'
                    : 'text-gray-600 hover:text-gray-950'
                }`}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition-all text-gray-900 placeholder:text-gray-400 bg-white shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition-all text-gray-900 placeholder:text-gray-400 bg-white shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                />
                <span className="text-xs text-gray-600">Remember for 30 days</span>
              </label>
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault()
                  alert('Use the pre-filled credentials to sign in!')
                }}
                className="text-xs font-medium text-gray-900 hover:underline"
              >
                Forgot password
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-gray-950 hover:bg-gray-800 text-white text-sm font-medium shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] mt-3 cursor-pointer"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
          <span>© Yanol-HR 2026</span>
          <a href="mailto:help@yanolhr.com" className="flex items-center gap-1.5 hover:text-gray-900 transition-colors">
            <Mail size={14} className="text-gray-400" />
            <span>help@yanolhr.com</span>
          </a>
        </div>
      </div>

      {/* ── RIGHT COLUMN: 50% Premium Dark Inset Slider ── */}
      <div className="w-full lg:w-1/2 p-4 sm:p-5 lg:p-6 flex flex-col bg-white">
        <div className="flex-1 rounded-[32px] bg-gradient-to-br from-[#232733] via-[#1c202b] to-[#161822] text-white flex flex-col justify-between relative overflow-hidden shadow-2xl border border-gray-700/30">
          {/* Ambient Glows */}
          <div className="absolute -right-24 -top-24 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Carousel Track */}
          <div className="my-auto relative w-full overflow-hidden py-5 px-3 sm:px-6">
            <div
              className="flex transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform"
              style={{ transform: `translateX(-${activeIdx * 100}%)` }}
            >
              {/* Slide 1: Employer Dashboard */}
              <div className="w-full shrink-0 flex items-center justify-center">
                <DashboardSlide />
              </div>

              {/* Slide 2: Team Chat & Live Popups */}
              <div className="w-full shrink-0 flex items-center justify-center">
                <ChatSlide chatStep={chatStep} />
              </div>

              {/* Slide 3: Executive Payroll & Compliance Report */}
              <div className="w-full shrink-0 flex items-center justify-center">
                <ReportSlide />
              </div>
            </div>
          </div>

          {/* Caption & Dots */}
          <div className="text-center pb-8 px-6 space-y-3">
            <div className="min-h-[52px] transition-opacity duration-500">
              <h2 className="text-lg font-bold tracking-tight text-white mb-1">{activeSlide.title}</h2>
              <p className="text-[11px] text-gray-400 leading-relaxed max-w-sm mx-auto">{activeSlide.description}</p>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
                    activeIdx === i ? 'w-5 bg-white' : 'w-1.5 bg-white/30 hover:bg-white/60'
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

export default Login