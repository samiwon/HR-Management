import { useEffect, useMemo, useState } from 'react'
import {
  Siren,
  X,
  AlertCircle,
  Loader2,
  Clock,
  TrendingUp,
  TrendingDown,
  Hourglass,
  CheckCircle2,
  MapPin,
  LogIn,
  LogOut,
  Check,
  ShieldCheck,
  Lock,
} from 'lucide-react'
import { getCurrentUser } from '../lib/currentUser'
import {
  getAddisNow,
  remainingLabel,
  getPunchState,
  subscribePunch,
  applyPunchStatus,
  getPunchAvailability,
  getWorkStartDisplay,
  getWorkEndDisplay,
  getCheckInCutoffDisplay,
  getCheckOutEndDisplay,
  parseTimeToMinutes,
} from '../lib/workTime'
import { formatClockLabel } from '../lib/addisTime'
import {
  punchCheckInApi,
  punchCheckOutApi,
  emergencyCheckOutApi,
  fetchPunchStatusApi,
} from '../lib/punchApi'
import { broadcastPunchFeedback } from './PunchWidget'
import {
  getPunchLocation,
  getPunchRadiusMeters,
  isGeoRestrictionEnabled,
  formatDistance,
} from '../lib/geo'
import { useAttendanceConfig } from '../hooks/useAttendanceConfig'
import GeoBlockModal from './GeoBlockModal'

function StatusCard({ icon: Icon, label, value, hint, tone }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-2xs dark:bg-[#15181d] dark:border-[#262b31]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</p>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${tone}`}>
          <Icon size={14} />
        </div>
      </div>
      <p className="text-xl font-bold text-gray-950 dark:text-gray-100 mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{hint}</p>}
    </div>
  )
}

export function EmergencyCheckOutButton({ onEvent }) {
  const user = getCurrentUser()
  const employeeName = user?.name || 'Employee'
  const employeeId = user?.employeeId || user?.email || 'EMP-0000'

  const [tick, setTick] = useState(0)
  const [punch, setPunch] = useState(getPunchState())
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const [remark, setRemark] = useState('')
  const [emergencyError, setEmergencyError] = useState('')
  const [busy, setBusy] = useState(false)
  const [geoBlock, setGeoBlock] = useState(null)

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => subscribePunch(setPunch), [])

  useEffect(() => {
    fetchPunchStatusApi()
      .then(applyPunchStatus)
      .catch(() => {})
  }, [])

  const config = useAttendanceConfig()
  const { minutes, dateKey, timeLabel } = useMemo(() => getAddisNow(), [tick])
  const { checkedIn, checkedOut, checkInAt } = punch

  const availability = useMemo(
    () => getPunchAvailability(minutes, config),
    [minutes, config],
  )

  const canEmergencyCheckOut = checkedIn && !checkedOut

  async function submitEmergency(e) {
    e.preventDefault()
    if (!canEmergencyCheckOut || busy) return

    const reason = remark.trim()
    if (reason.length < 5) {
      setEmergencyError('Please describe the reason (at least 5 characters).')
      return
    }
    setEmergencyError('')

    try {
      setBusy(true)
      const coords = await getPunchLocation()
      const radius = getPunchRadiusMeters()
      if (isGeoRestrictionEnabled() && coords.distanceMeters > radius) {
        setGeoBlock(
          `You are ${formatDistance(coords.distanceMeters)} from the office. Emergency check-out is blocked outside the ${radius}m radius.`
        )
        setEmergencyOpen(false)
        setRemark('')
        return
      }
      const res = await emergencyCheckOutApi(reason, coords)
      applyPunchStatus({
        checkedIn: true,
        checkedOut: true,
        checkOut: res.record?.checkOut,
        status: res.status || 'PRESENT',
        attendanceConfig: res.attendanceConfig,
      })
      broadcastPunchFeedback({
        tone: 'ok',
        text: res.message || 'Emergency check-out recorded. HR has been notified.',
      })
      onEvent?.({ type: 'emergency-check-out', date: dateKey, time: timeLabel })
      setEmergencyOpen(false)
      setRemark('')
    } catch (err) {
      if (err.code === 'OUTSIDE_PUNCH_RADIUS' || err.code === 'LOCATION_REQUIRED') {
        setGeoBlock(String(err.message || 'You must be inside the office for an emergency check-out.'))
        setEmergencyOpen(false)
        setRemark('')
      } else {
        setEmergencyError(
          err.message ||
            'Could not reach HR. Your check-out was NOT recorded — try again or contact HR directly.'
        )
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!canEmergencyCheckOut || busy) return
          setEmergencyError('')
          setEmergencyOpen(true)
        }}
        disabled={!canEmergencyCheckOut || busy}
        title={
          !checkedIn
            ? 'Check in first'
            : checkedOut
            ? 'Day already closed'
            : 'Leave early with a reason — HR will be notified'
        }
        className={`h-9 px-3.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all ${
          canEmergencyCheckOut && !busy
            ? 'border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 cursor-pointer shadow-2xs dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300'
            : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed dark:bg-[#1c2026] dark:border-[#262b31] dark:text-slate-500'
        }`}
      >
        <Siren size={13} />
        <span>Emergency Checkout</span>
      </button>

      {emergencyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#15181d] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#262b31] w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-[#262b31] flex items-center justify-between bg-rose-50/70 dark:bg-[#1c2026]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center">
                  <Siren size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100">
                    Emergency Check-Out
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    HR Manager will be notified immediately
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEmergencyOpen(false)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitEmergency} className="p-6 space-y-4 text-xs">
              <div className="rounded-xl bg-slate-50 dark:bg-[#1c2026] border border-slate-200 dark:border-[#262b31] p-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Employee</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {employeeName} ({employeeId})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Checked in at</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                    {formatClockLabel(parseTimeToMinutes(checkInAt)) || checkInAt}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Departing at</span>
                  <span className="font-mono font-bold text-rose-600">{timeLabel} (Ethiopian Time)</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1">
                  Reason / Remark <span className="text-rose-600">*</span>
                </label>
                <textarea
                  autoFocus
                  rows={4}
                  value={remark}
                  onChange={(e) => {
                    setRemark(e.target.value)
                    if (emergencyError) setEmergencyError('')
                  }}
                  placeholder="e.g. Family emergency — need to leave for St. Paul's Hospital now."
                  className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-[#15181d] dark:text-gray-200 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 resize-none ${
                    emergencyError
                      ? 'border-rose-400 focus:ring-rose-500'
                      : 'border-gray-300 dark:border-[#33383f] focus:ring-gray-900'
                  }`}
                />
                {emergencyError && (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={11} /> {emergencyError}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-[#262b31] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEmergencyOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-[#33383f] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1c2026] font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  {busy ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      <Siren size={13} /> Confirm & Notify HR
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <GeoBlockModal message={geoBlock} onClose={() => setGeoBlock(null)} />
    </>
  )
}

export default function PunchCard() {
  const [tick, setTick] = useState(0)
  const [punch, setPunch] = useState(getPunchState())
  const [busy, setBusy] = useState(false)
  const [geoBlock, setGeoBlock] = useState(null)
  const config = useAttendanceConfig()

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => subscribePunch(setPunch), [])

  useEffect(() => {
    const refresh = () => {
      fetchPunchStatusApi()
        .then(applyPunchStatus)
        .catch(() => {})
    }
    refresh()
    const interval = setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  const { minutes, timeKey, timeLabel } = useMemo(() => getAddisNow(), [tick])
  const { checkedIn, checkedOut, checkInAt, checkOutAt, onLeave } = punch

  const availability = useMemo(
    () => getPunchAvailability(minutes, config),
    [minutes, config],
  )

  const canCheckIn = availability.canCheckIn && !checkedIn && !checkedOut
  const canCheckOut = availability.canCheckOut && checkedIn && !checkedOut

  async function handleCheckIn() {
    setBusy(true)
    try {
      const coords = await getPunchLocation()
      const radius = getPunchRadiusMeters()
      if (isGeoRestrictionEnabled() && coords.distanceMeters > radius) {
        setGeoBlock(
          `You are ${formatDistance(coords.distanceMeters)} from the office. Check-in is blocked outside the ${radius}m radius.`
        )
        return
      }
      const res = await punchCheckInApi(coords)
      applyPunchStatus({
        checkedIn: true,
        checkIn: res.record?.checkIn || res.checkIn || null,
        checkedOut: Boolean(res.record?.checkOut),
        checkOut: res.record?.checkOut || null,
        status: res.status || 'PRESENT',
        attendanceConfig: res.attendanceConfig,
      })
      broadcastPunchFeedback({
        tone: 'ok',
        text: `${res.message}${isGeoRestrictionEnabled() ? ` (${formatDistance(coords.distanceMeters)} from office)` : ''}`,
      })
    } catch (err) {
      if (err.code === 'OUTSIDE_PUNCH_RADIUS' || err.code === 'LOCATION_REQUIRED') {
        setGeoBlock(String(err.message || 'You must be inside the office to check in.'))
      } else {
        broadcastPunchFeedback({ tone: 'err', text: err.message })
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleCheckOut() {
    setBusy(true)
    try {
      const coords = await getPunchLocation()
      const radius = getPunchRadiusMeters()
      if (isGeoRestrictionEnabled() && coords.distanceMeters > radius) {
        setGeoBlock(
          `You are ${formatDistance(coords.distanceMeters)} from the office. Check-out is blocked outside the ${radius}m radius.`
        )
        return
      }
      const res = await punchCheckOutApi(coords)
      applyPunchStatus({
        checkedIn: true,
        checkedOut: true,
        checkIn: res.record?.checkIn || checkInAt,
        checkOut: res.record?.checkOut || res.checkOut || null,
        status: res.status || 'PRESENT',
        attendanceConfig: res.attendanceConfig,
      })
      broadcastPunchFeedback({
        tone: 'ok',
        text: `${res.message}${isGeoRestrictionEnabled() ? ` (${formatDistance(coords.distanceMeters)} from office)` : ''}`,
      })
    } catch (err) {
      if (err.code === 'OUTSIDE_PUNCH_RADIUS' || err.code === 'LOCATION_REQUIRED') {
        setGeoBlock(String(err.message || 'You must be inside the office to check out.'))
      } else {
        broadcastPunchFeedback({ tone: 'err', text: err.message })
      }
    } finally {
      setBusy(false)
    }
  }

  const stats = {
    avgLateMin: availability.isLate ? availability.lateMinutes : 0,
    avgEarlyMin: availability.isEarlyDeparture ? availability.earlyDepartureMinutes : 0,
    overtimeHours: availability.isOvertime ? (availability.overtimeMinutes / 60).toFixed(1) : '0.0',
    pendingCheckOut: checkedIn && !checkedOut,
  }

  return (
    <div className="space-y-4">
      {/* ── Main Punch Clock Action Card ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-[#262b31] dark:bg-[#15181d]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-[#262b31]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Attendance Punch &amp; Schedule
              </h3>
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                Ethiopian Time: {timeLabel} ({timeKey})
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Check-In: <strong className="font-semibold text-slate-700 dark:text-slate-200">{config.checkInStartTime || '08:00'} ({getWorkStartDisplay(config)})</strong> · Cutoff: <strong className="font-semibold text-slate-700 dark:text-slate-200">{config.requiredCheckInTime || '08:30'} ({getCheckInCutoffDisplay(config)})</strong> · Check-Out: <strong className="font-semibold text-slate-700 dark:text-slate-200">{config.checkOutStartTime || '17:30'} ({getWorkEndDisplay(config)})</strong> · Shift End: <strong className="font-semibold text-slate-700 dark:text-slate-200">{config.checkOutEndTime || '19:00'} ({getCheckOutEndDisplay(config)})</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isGeoRestrictionEnabled() ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                <MapPin size={12} /> Geofence Active ({getPunchRadiusMeters()}m)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-[#1c2026] dark:text-slate-400">
                <ShieldCheck size={12} /> Remote Punch Allowed
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons & Status */}
        <div className="mt-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Status indicator */}
            {!checkedIn && !checkedOut && (
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[#1c2026] dark:text-slate-300">
                  <LogIn size={22} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Ready to Check In
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {canCheckIn
                      ? availability.isLate
                        ? `Check-in open — late by ${((availability.lateMinutes || 0) / 60).toFixed(1)} hrs past cutoff`
                        : `Check-in is open now (On-time until ${config.requiredCheckInTime || '08:30'})`
                      : `Opens at ${config.checkInStartTime || '08:00'} (${getWorkStartDisplay(config)})`}
                  </p>
                </div>
              </div>
            )}

            {checkedIn && !checkedOut && (
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Checked In at {formatClockLabel(parseTimeToMinutes(checkInAt)) || checkInAt} ({checkInAt})
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    {availability.isEarlyDeparture
                      ? `Shift active (${availability.earlyDepartureMinutes}m until scheduled end ${getCheckOutEndDisplay(config)})`
                      : availability.isOvertime
                      ? `Overtime active (+${availability.overtimeMinutes}m)`
                      : 'Shift in progress'}
                  </p>
                </div>
              </div>
            )}

            {checkedOut && (
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                  <Check size={22} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Shift Completed Today
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    In: <strong className="text-slate-700 dark:text-slate-200">{checkInAt}</strong> · Out: <strong className="text-slate-700 dark:text-slate-200">{checkOutAt}</strong>
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* 1. CHECK IN BUTTON */}
            {!checkedIn && !checkedOut ? (
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={!canCheckIn || busy}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold shadow-xs transition-all ${
                  canCheckIn && !busy
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer'
                    : 'bg-slate-100 text-slate-400 dark:bg-[#1c2026] dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-[#33383f]'
                }`}
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : canCheckIn ? <LogIn size={16} /> : <Lock size={16} />}
                <span>{canCheckIn ? 'Check In Now' : `Opens at ${config.checkInStartTime || '08:00'}`}</span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60">
                <Check size={14} /> Checked In ({checkInAt})
              </div>
            )}

            {/* 2. CHECK OUT BUTTON */}
            {checkedIn && !checkedOut ? (
              <button
                type="button"
                onClick={handleCheckOut}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all cursor-pointer"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                <span>Check Out Now</span>
              </button>
            ) : checkedOut ? (
              <div className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-900/60">
                <Check size={14} /> Checked Out ({checkOutAt})
              </div>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-400 dark:bg-[#1c2026] dark:text-slate-500 cursor-not-allowed"
              >
                <LogOut size={15} />
                <span>Check Out (Check In First)</span>
              </button>
            )}

            {/* 3. EMERGENCY CHECK OUT */}
            <EmergencyCheckOutButton />
          </div>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          icon={TrendingUp}
          label="Avg Late Time"
          value={`${stats.avgLateMin}m`}
          hint={`Past cutoff ${config.requiredCheckInTime || '08:30'} (${getCheckInCutoffDisplay()})`}
          tone="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
        />
        <StatusCard
          icon={TrendingDown}
          label="Early Departure"
          value={`${stats.avgEarlyMin}m`}
          hint={`Before shift end ${config.checkOutEndTime || '19:00'} (${getCheckOutEndDisplay()})`}
          tone="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
        />
        <StatusCard
          icon={Clock}
          label="Overtime"
          value={`${stats.overtimeHours}h`}
          hint={`Beyond ${config.checkOutEndTime || '19:00'} (${getCheckOutEndDisplay()})`}
          tone="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
        />
        <StatusCard
          icon={Hourglass}
          label="Shift Status"
          value={checkedOut ? 'Completed' : checkedIn ? 'In Progress' : 'Not Started'}
          hint={
            checkedOut
              ? `Done: In ${checkInAt} · Out ${checkOutAt}`
              : checkedIn
              ? `Checked In at ${checkInAt}`
              : `Check-in opens ${config.checkInStartTime || '08:00'} (${getWorkStartDisplay()})`
          }
          tone={
            checkedOut
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
              : checkedIn
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300'
          }
        />
      </div>

      <GeoBlockModal message={geoBlock} onClose={() => setGeoBlock(null)} />
    </div>
  )
}
