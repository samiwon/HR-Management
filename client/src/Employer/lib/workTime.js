// ─────────────────────────────────────────────────────────────
// WORK TIME RULES (UTC+3 — Addis Ababa)
// Work day:          Mon–Fri
//
// All four times are DYNAMIC — configured by the HR admin on
// HR Settings > Check-In & Check-Out Schedule and delivered with the
// punch state by GET /api/employer/attendance/status. Defaults:
//   checkInStartTime    08:00  check-in OPENS
//   requiredCheckInTime 08:30  late cutoff — after this it is LATE
//   checkOutStartTime   17:30  check-out OPENS
//   checkOutEndTime     19:00  scheduled end — the reference the
//                              server measures early departure and
//                              overtime against
//
// What each time actually does, and this is enforced identically by
// the backend (getCheckInTiming / checkOut in employer.controller.js):
//
//   Before checkInStartTime          check-in is NOT AVAILABLE
//   checkInStartTime … cutoff        check-in available, on time
//   after requiredCheckInTime        check-in STILL available, but
//                                    recorded LATE with the minutes
//                                    counted from the cutoff
//   Before checkOutStartTime         check-out is NOT AVAILABLE
//   checkOutStartTime onward         check-out available
//
// The upper bounds are deliberately NOT a hard gate. A hard cutoff means
// an employee who arrives late or forgets to check out can never record
// the day at all, and the row stays incomplete for payroll. Instead the
// configured end times are the yardstick the server measures lateness,
// early departure and overtime against — so the numbers HR types in
// decide what the record says, without stranding anyone.
//
// Weekend:           Sat/Sun — check-in & check-out disabled
// Emergency:         check-out with mandatory remark, notifies HR
//                    (Attendance section only)
// ─────────────────────────────────────────────────────────────

import { setGeoConfig } from './geo'

import {
  getAddisNow as readAddisNow,
  toEthiopianTime,
} from './addisTime'

export function parseTimeToMinutes(timeStr, defaultMinutes = 0) {
  if (!timeStr) return defaultMinutes
  const parts = String(timeStr).split(':').map(Number)
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) {
    return defaultMinutes
  }
  if (parts[0] < 0 || parts[0] > 23 || parts[1] < 0 || parts[1] > 59) {
    return defaultMinutes
  }
  return parts[0] * 60 + parts[1]
}

export function formatMinutesToDisplay(minutes) {
  if (!Number.isFinite(minutes)) return ''
  const { hour, minute, period } = toEthiopianTime(minutes)
  return `${hour}:${String(minute).padStart(2, '0')} ${period}`
}

// Punch-state subscribers. Declared here (above setAttendanceConfig)
// so there is no temporal-dead-zone hazard if the config is pushed in
// before the rest of this module has been evaluated.
const listeners = new Set()

// Schedule subscribers — see subscribeAttendanceConfig below.
const configListeners = new Set()

// ─────────────────────────────────────────────────────────────
// Attendance schedule — the four times the HR admin sets on
// Settings > Check-In & Check-Out Schedule.
//
// Everything the punch UI shows or gates on is derived from here, so
// a change on the HR settings page moves the employee's check-in and
// check-out times together, never one without the other.
//
// The values are normalised on the way in: an empty, malformed or
// out-of-range time falls back to the documented default instead of
// silently becoming an unreachable window that disables the button.
// ─────────────────────────────────────────────────────────────

const SCHEDULE_DEFAULTS = {
  checkInStartTime: '08:00',
  requiredCheckInTime: '08:30',
  checkOutStartTime: '17:30',
  checkOutEndTime: '19:00',
}

const GEO_DEFAULTS = {
  geoRestrictionEnabled: true,
  officeLatitude: 8.999654748138806,
  officeLongitude: 38.820610900000005,
  allowedRadiusMeters: 100,
}

// Accepts "H:MM", "HH:MM", "HH:MM:SS" and anything Date can parse.
// Returns "HH:MM" or null when the input is not a usable time.
function normalizeClockTime(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const raw = String(value).trim()

  const match = raw.match(
    /^(\d{1,2}):(\d{2})(?::\d{2})?$/,
  )

  if (match) {
    const hours = Number(match[1])
    const minutes = Number(match[2])

    if (
      hours >= 0 &&
      hours <= 23 &&
      minutes >= 0 &&
      minutes <= 59
    ) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }

    return null
  }

  // Anything else (e.g. an ISO timestamp) — try to read a time out of it.
  const parsed = new Date(raw)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Addis_Ababa',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(parsed)

  const values = {}

  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value
    }
  }

  if (values.hour === undefined || values.minute === undefined) {
    return null
  }

  return `${values.hour}:${values.minute}`
}

function getInitialAttendanceConfig() {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('hr_attendance_config') : null
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        return {
          ...SCHEDULE_DEFAULTS,
          ...GEO_DEFAULTS,
          ...parsed,
        }
      }
    }
  } catch {}

  return {
    ...SCHEDULE_DEFAULTS,
    ...GEO_DEFAULTS,
  }
}

let attendanceConfig = getInitialAttendanceConfig()

export function setAttendanceConfig(newConfig = {}) {
  if (!newConfig) return

  const merged = {
    ...attendanceConfig,
    ...newConfig,
  }

  const normalized = { ...merged }

  for (const [key, fallback] of Object.entries(
    SCHEDULE_DEFAULTS,
  )) {
    const time = normalizeClockTime(merged[key])

    if (!time) {
      normalized[key] =
        attendanceConfig[key] && normalizeClockTime(attendanceConfig[key])
          ? attendanceConfig[key]
          : fallback
    } else {
      normalized[key] = time
    }
  }

  if (
    newConfig.geoRestrictionEnabled !== undefined &&
    newConfig.geoRestrictionEnabled !== null
  ) {
    normalized.geoRestrictionEnabled =
      newConfig.geoRestrictionEnabled !== false
  }

  attendanceConfig = normalized

  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hr_attendance_config', JSON.stringify(normalized))
    }
  } catch {}

  setGeoConfig(normalized)

  configListeners.forEach((fn) => fn(normalized))
  listeners.forEach((fn) => fn(state))
}

if (typeof window !== 'undefined') {
  window.addEventListener('attendance-config-updated', (e) => {
    if (e.detail) {
      setAttendanceConfig(e.detail)
    }
  })

  window.addEventListener('storage', (e) => {
    if (e.key === 'hr_attendance_config' && e.newValue) {
      try {
        setAttendanceConfig(JSON.parse(e.newValue))
      } catch {}
    }
  })
}

// Subscribers to the schedule itself, so a component that pre-fills a
// form from it re-renders the moment HR saves new times instead of
// waiting for its next parent render.
export function subscribeAttendanceConfig(fn) {
  configListeners.add(fn)

  return () => {
    configListeners.delete(fn)
  }
}

export function getAttendanceConfig() {
  return attendanceConfig
}

// The raw HH:MM values exactly as the HR admin entered them, so the
// UI can display them verbatim rather than reformatting.
export function getScheduleTimes() {
  return {
    checkInStartTime: attendanceConfig.checkInStartTime,
    requiredCheckInTime: attendanceConfig.requiredCheckInTime,
    checkOutStartTime: attendanceConfig.checkOutStartTime,
    checkOutEndTime: attendanceConfig.checkOutEndTime,
  }
}

export function getWorkStartMinutes(customConfig = null) {
  const cfg = customConfig || attendanceConfig
  return parseTimeToMinutes(cfg?.checkInStartTime, 8 * 60)
}

export function getCheckInCutoffMinutes(customConfig = null) {
  const cfg = customConfig || attendanceConfig
  return parseTimeToMinutes(cfg?.requiredCheckInTime, 8 * 60 + 30)
}

export function getWorkEndMinutes(customConfig = null) {
  const cfg = customConfig || attendanceConfig
  return parseTimeToMinutes(cfg?.checkOutStartTime, 17 * 60 + 30)
}

export function getCheckOutEndMinutes(customConfig = null) {
  const cfg = customConfig || attendanceConfig
  return parseTimeToMinutes(cfg?.checkOutEndTime, 19 * 60)
}

export function getWorkStartDisplay(customConfig = null) {
  return formatMinutesToDisplay(getWorkStartMinutes(customConfig))
}

export function getCheckInCutoffDisplay(customConfig = null) {
  return formatMinutesToDisplay(getCheckInCutoffMinutes(customConfig))
}

export function getWorkEndDisplay(customConfig = null) {
  return formatMinutesToDisplay(getWorkEndMinutes(customConfig))
}

export function getCheckOutEndDisplay(customConfig = null) {
  return formatMinutesToDisplay(getCheckOutEndMinutes(customConfig))
}

// @deprecated — use getWorkStartMinutes() instead (reads HR admin config)
export const WORK_START_MINUTES = 8 * 60
// @deprecated — use getCheckInCutoffMinutes() instead (reads HR admin config)
export const CHECK_IN_CUTOFF_MINUTES = 8 * 60 + 30
// @deprecated — use getWorkEndMinutes() instead (reads HR admin config)
export const WORK_END_MINUTES = 17 * 60 + 30
// @deprecated — use attendanceConfig.checkOutStartTime instead
export const WORK_END_LABEL = '17:30'
// @deprecated — use getWorkEndDisplay() instead (reads HR admin config)
export const WORK_END_DISPLAY = '5:30 PM'

// "Now" for attendance purposes. Delegates to addisTime so the
// employee's device clock, the browser timezone and the server all
// resolve to the same Addis Ababa day and time.
function getAddisNow() {
  return readAddisNow()
}

export function isWorkDay(day) {
  return day >= 1 && day <= 5
}

// ─────────────────────────────────────────────────────────────
// Availability — the one place that answers "can this employee
// punch right now, and what does the record become if they do?"
//
// Every surface (header widget, Attendance page, tooltips) derives
// its answer from here, so they cannot disagree with each other or
// with the backend, which enforces the identical arithmetic against
// the same four HR-configured times.
//
// The availability is derived from the CURRENT clock on every call.
// Nothing here is a snapshot taken at poll time: the widget re-reads
// it on each tick, so a window opens on the minute HR configured
// rather than whenever the next poll happened to land.
//
// Deliberately not a hard upper bound on either punch. A late or
// forgetful employee can still record the day, and the configured end
// times are what the server measures the lateness against — that way
// the record is always complete, and the configured numbers still
// decide what it says.
// ─────────────────────────────────────────────────────────────

export function getPunchAvailability(minutes, customConfig = null) {
  const checkInStart = getWorkStartMinutes(customConfig)
  const checkInCutoff = getCheckInCutoffMinutes(customConfig)
  const checkOutStart = getWorkEndMinutes(customConfig)
  const checkOutEnd = getCheckOutEndMinutes(customConfig)

  return {
    // Check-in opens at checkInStartTime and stays open.
    canCheckIn: minutes >= checkInStart,

    // On time up to the cutoff; after it, late by the difference.
    isLate: minutes > checkInCutoff,
    lateMinutes:
      minutes > checkInCutoff ? minutes - checkInCutoff : 0,

    // Check-out is available only between start and end times as per HR settings
    canCheckOut: minutes >= checkOutStart && minutes <= checkOutEnd,

    // Past the scheduled end — recorded as overtime, not blocked.
    isOvertime: minutes > checkOutEnd,
    overtimeMinutes:
      minutes > checkOutEnd ? minutes - checkOutEnd : 0,

    isEarlyDeparture:
      minutes < checkOutEnd,
    earlyDepartureMinutes:
      minutes < checkOutEnd
        ? checkOutEnd - minutes
        : 0,

    minutes,
    checkInStart,
    checkInCutoff,
    checkOutStart,
    checkOutEnd,
  }
}

// @deprecated — kept so existing imports keep working. Prefer
// getPunchAvailability(minutes).canCheckIn, which returns the same thing.
export function isWithinCheckInWindow(minutes) {
  return getPunchAvailability(minutes).canCheckIn
}

// @deprecated — prefer getPunchAvailability(minutes).canCheckOut.
export function isCheckInOpen(minutes) {
  return getPunchAvailability(minutes).canCheckIn
}

// @deprecated — prefer getPunchAvailability(minutes).isLate.
export function isLateCheckIn(minutes) {
  return getPunchAvailability(minutes).isLate
}

// @deprecated — prefer getPunchAvailability(minutes).lateMinutes.
export function getLateMinutes(minutes) {
  return getPunchAvailability(minutes).lateMinutes
}

// @deprecated — prefer getPunchAvailability(minutes).canCheckOut.
export function isCheckOutTime(minutes) {
  return getPunchAvailability(minutes).canCheckOut
}

// @deprecated — prefer getPunchAvailability(minutes).canCheckOut.
export function isWithinCheckOutWindow(minutes) {
  return getPunchAvailability(minutes).canCheckOut
}

// Minutes remaining until check-out opens. Clamped at 0 so a late
// employee does not see a negative countdown.
export function remainingLabel(minutes) {
  const remaining = Math.max(0, getWorkEndMinutes() - minutes)
  const h = Math.floor(remaining / 60)
  const m = remaining % 60
  if (h > 0) {
    return `${h}h ${m}m`
  }
  return `${m}m`
}

export {
  getAddisNow,
}

// ─────────────────────────────────────────────────────────────
// Shared punch status — one store consumed by the header widget
// and the Attendance page (emergency button + status cards) so
// they never disagree. Backend is the source of truth.
//
// Also carries the HR-adjusted status of today's record so the
// employee sees HR feedback (Acknowledged / Absent / …) live.
// ─────────────────────────────────────────────────────────────

// `listeners` is declared near the top of this module (above
// setAttendanceConfig) so config pushes can never hit the TDZ.

let state = {
  loaded: false,

  checkedIn: false,

  checkInAt: null,

  checkedOut: false,

  checkOutAt: null,

  isEmergency: false,

  employeeRemark: null,

  // The punch status written by the clock (Present / Late / Absent …).
  status: null,

  hrStatus: null,

  hrNote: null,

  hrUpdatedAt: null,

  onLeave: null,
}

export function getPunchState() {
  return state
}

export function setPunchState(
  patch,
) {
  state = {
    ...state,
    ...patch,
  }

  listeners.forEach(
    (fn) => fn(state),
  )
}

// Merge a punch status from the backend (or from a punch response).
//
// Only the keys actually present in the payload are touched. That
// matters for partial payloads: after a successful check-in the
// widget sends just { checkedIn, checkIn, checkedOut }, and the
// on-leave flag / HR review note already in the store must survive
// instead of being wiped back to null until the next poll.
export function applyPunchStatus(
  status = {},
) {
  const config = status.attendanceConfig || (status.checkInStartTime ? {
    checkInStartTime: status.checkInStartTime,
    requiredCheckInTime: status.requiredCheckInTime,
    checkOutStartTime: status.checkOutStartTime,
    checkOutEndTime: status.checkOutEndTime,
    geoRestrictionEnabled: status.geoRestrictionEnabled,
    officeLatitude: status.officeLatitude,
    officeLongitude: status.officeLongitude,
    allowedRadiusMeters: status.allowedRadiusMeters,
  } : null)

  if (config) {
    setAttendanceConfig(config)
  }

  const patch = {
    loaded: true,
  }

  if (
    'checkedIn' in status
  ) {
    patch.checkedIn =
      Boolean(status.checkedIn)
  }

  if (
    'checkIn' in status
  ) {
    patch.checkInAt =
      status.checkIn ||
      null
  }

  if (
    'checkedOut' in status
  ) {
    patch.checkedOut =
      Boolean(status.checkedOut)
  }

  if (
    'checkOut' in status
  ) {
    patch.checkOutAt =
      status.checkOut ||
      null
  }

  if (
    'status' in status
  ) {
    patch.status =
      status.status ||
      null
  }

  if (
    'isEmergency' in status
  ) {
    patch.isEmergency =
      Boolean(status.isEmergency)
  }

  if (
    'employeeRemark' in status
  ) {
    patch.employeeRemark =
      status.employeeRemark ||
      null
  }

  if (
    'hrStatus' in status
  ) {
    patch.hrStatus =
      status.hrStatus ||
      null
  }

  if (
    'hrNote' in status
  ) {
    patch.hrNote =
      status.hrNote ||
      null
  }

  if (
    'hrUpdatedAt' in status
  ) {
    patch.hrUpdatedAt =
      status.hrUpdatedAt ||
      null
  }

  if (
    'onLeave' in status
  ) {
    patch.onLeave =
      status.onLeave ||
      null
  }

  // checkInWindowOpen / checkOutWindowOpen are deliberately NOT
  // stored. They were a snapshot of the server's clock taken at poll
  // time, and the widget preferred them over its own live clock — so
  // a window opened up to a full poll interval after the minute HR
  // configured. Availability is now derived from getPunchAvailability()
  // against the current clock and the shared config, which cannot go
  // stale between ticks. The server still returns the flags for the
  // Attendance page's diagnostics, but nothing gates on them.

  setPunchState(patch)
}

export function subscribePunch(
  fn,
) {
  listeners.add(fn)

  return () =>
    listeners.delete(fn)
}
