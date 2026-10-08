import { useEffect, useMemo, useState } from 'react'
import { LogIn, LogOut, Loader2, Check, CalendarOff, Lock } from 'lucide-react'
import {
  getAddisNow,
  getPunchAvailability,
  formatMinutesToDisplay,
  remainingLabel,
  getPunchState,
  subscribePunch,
  applyPunchStatus,
  getWorkStartDisplay,
  getWorkEndDisplay,
  getCheckInCutoffDisplay,
  getAttendanceConfig,
} from '../lib/workTime'
import { useAttendanceConfig } from '../hooks/useAttendanceConfig'
import {
  fetchPunchStatusApi,
  punchCheckInApi,
  punchCheckOutApi,
} from '../lib/punchApi'
import {
  getPunchLocation,
  getPunchRadiusMeters,
  isGeoRestrictionEnabled,
  formatDistance,
} from '../lib/geo'
import GeoBlockModal from './GeoBlockModal'

// Event bus for punch feedback toasts
export const PUNCH_FEEDBACK_EVENT = 'punch-feedback'

export function broadcastPunchFeedback(detail) {
  window.dispatchEvent(new CustomEvent(PUNCH_FEEDBACK_EVENT, { detail }))
}

function remainingTo(target, minutes) {
  const remaining = Math.max(0, target - minutes)
  const h = Math.floor(remaining / 60)
  const m = remaining % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function PunchWidget() {
  const [tick, setTick] = useState(0)
  const [punch, setPunch] = useState(getPunchState())
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const [geoBlock, setGeoBlock] = useState(null)

  // Clock tick every 10 seconds to re-evaluate punch availability in real-time
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10000)
    return () => clearInterval(timer)
  }, [])

  // Mirror punches made anywhere
  useEffect(() => subscribePunch(setPunch), [])

  // Show feedback toasts
  useEffect(() => {
    const onFeedback = (e) => {
      setToast(e.detail)
      setTimeout(() => setToast(null), 5000)
    }
    window.addEventListener(PUNCH_FEEDBACK_EVENT, onFeedback)
    return () => window.removeEventListener(PUNCH_FEEDBACK_EVENT, onFeedback)
  }, [])

  // Fetch status on mount, focus, and every 30s
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

  const config = useAttendanceConfig()
  const { minutes } = useMemo(() => getAddisNow(), [tick])
  const { checkedIn, checkedOut, checkInAt, checkOutAt, onLeave } = punch

  const availability = useMemo(
    () => getPunchAvailability(minutes, config),
    [minutes, config],
  )

  const canCheckIn = availability.canCheckIn && !checkedIn && !checkedOut
  const canCheckOut = availability.canCheckOut && checkedIn && !checkedOut

  const resync = () => {
    fetchPunchStatusApi()
      .then(applyPunchStatus)
      .catch(() => {})
  }

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
        resync()
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
        resync()
      }
    } finally {
      setBusy(false)
    }
  }

  // Removed early return for onLeave so they can still check in if they work

  // 2. DAY COMPLETED (Checked Out)
  if (checkedOut) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 h-8 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-[11px] font-bold dark:border-[#262b31] dark:bg-[#15181d] dark:text-slate-300 shadow-2xs">
          <Check size={14} className="text-emerald-600" />
          <span className="tabular-nums">In: {checkInAt}</span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="tabular-nums">Out: {checkOutAt}</span>
        </div>
      </div>
    )
  }

  // 3. CHECKED IN (Ready to Check Out)
  if (checkedIn && !checkedOut) {
    return (
      <div className="relative flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-indigo-200/80 bg-indigo-50/70 dark:border-indigo-900/60 dark:bg-indigo-950/30 px-2.5 py-1 shadow-2xs">
          <div className="hidden sm:flex flex-col items-end text-[10px] leading-tight select-none">
            <span className="font-bold text-indigo-900 dark:text-indigo-200 tabular-nums">
              In at {checkInAt}
            </span>
            <span className={availability.isOvertime ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}>
              {availability.isOvertime
                ? `OT +${availability.overtimeMinutes}m`
                : availability.isEarlyDeparture
                ? `Ends ${config.checkOutEndTime || '19:00'} (${getWorkEndDisplay(config)})`
                : 'Shift Active'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCheckOut}
            disabled={busy}
            title={`Check Out — Opens at ${config.checkOutStartTime} (${getWorkEndDisplay(config)})`}
            className="h-8 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
            <span>Check Out</span>
          </button>
        </div>

        {/* Toast feedback */}
        {toast && (
          <div
            className={`absolute right-0 top-full mt-2 w-64 rounded-xl border px-3 py-2.5 text-xs font-medium shadow-lg z-50 ${
              toast.tone === 'ok'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950 dark:text-emerald-300'
                : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950 dark:text-rose-300'
            }`}
          >
            {toast.text}
          </div>
        )}

        <GeoBlockModal message={geoBlock} onClose={() => setGeoBlock(null)} />
      </div>
    )
  }

  // 4. NOT CHECKED IN YET (Show Check In)
  return (
    <div className="relative flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1 shadow-2xs dark:border-[#262b31] dark:bg-[#15181d]">
        <div className="hidden sm:flex flex-col items-end text-[10px] leading-tight select-none">
          <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
            Shift {config.checkInStartTime || '08:00'} ({getWorkStartDisplay(config)})
          </span>
          <span className={canCheckIn ? (availability.isLate ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-semibold') : 'text-slate-400 dark:text-slate-500'}>
            {canCheckIn
              ? availability.isLate
                ? `Late +${((availability.lateMinutes || 0) / 60).toFixed(1)}h`
                : 'Check-In Open'
              : `Opens at ${config.checkInStartTime || '08:00'}`}
          </span>
        </div>

        {canCheckIn ? (
          <button
            type="button"
            onClick={handleCheckIn}
            disabled={busy}
            title={`Check In — On-time until ${config.requiredCheckInTime || '08:30'} (${getCheckInCutoffDisplay(config)})`}
            className="h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <LogIn size={13} />}
            <span>Check In</span>
          </button>
        ) : (
          <button
            type="button"
            disabled
            title={`Check-in opens at ${config.checkInStartTime || '08:00'} (${getWorkStartDisplay(config)}) — ${remainingTo(availability.checkInStart, minutes)} to go`}
            className="h-8 px-3 rounded-lg border border-slate-200 bg-slate-100 dark:border-[#33383f] dark:bg-[#1c2026] text-slate-400 dark:text-slate-500 text-[11px] font-semibold flex items-center gap-1.5 cursor-not-allowed"
          >
            <Lock size={12} />
            <span>Opens {config.checkInStartTime || '08:00'}</span>
          </button>
        )}
      </div>

      {/* Toast feedback */}
      {toast && (
        <div
          className={`absolute right-0 top-full mt-2 w-64 rounded-xl border px-3 py-2.5 text-xs font-medium shadow-lg z-50 ${
            toast.tone === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950 dark:text-emerald-300'
              : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950 dark:text-rose-300'
          }`}
        >
          {toast.text}
        </div>
      )}

      <GeoBlockModal message={geoBlock} onClose={() => setGeoBlock(null)} />
    </div>
  )
}