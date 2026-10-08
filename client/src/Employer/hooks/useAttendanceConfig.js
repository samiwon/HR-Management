// ─────────────────────────────────────────────────────────────
// React bindings for the shared attendance schedule.
//
// The schedule itself lives in workTime.js (fed by HR Settings).
// These hooks let a component re-render the moment HR saves new
// check-in / check-out times, instead of showing whatever happened
// to be cached when the component last mounted.
// ─────────────────────────────────────────────────────────────

import { useEffect, useSyncExternalStore } from 'react'

import {
  getAttendanceConfig,
  subscribeAttendanceConfig,
  applyPunchStatus,
} from '../lib/workTime'
import { fetchPunchStatusApi, fetchAttendanceConfigApi } from '../lib/punchApi'

// The whole attendance configuration (schedule + geofence).
export function useAttendanceConfig() {
  useEffect(() => {
    fetchPunchStatusApi()
      .then(applyPunchStatus)
      .catch(() => {
        fetchAttendanceConfigApi()
          .then((cfg) => {
            if (cfg) applyPunchStatus({ attendanceConfig: cfg })
          })
          .catch(() => {})
      })
  }, [])

  return useSyncExternalStore(
    subscribeAttendanceConfig,
    getAttendanceConfig,
    getAttendanceConfig,
  )
}

// Just the four times, as the HR admin typed them.
export function useScheduleTimes() {
  const config = useAttendanceConfig()

  return {
    checkInStartTime: config.checkInStartTime,
    requiredCheckInTime: config.requiredCheckInTime,
    checkOutStartTime: config.checkOutStartTime,
    checkOutEndTime: config.checkOutEndTime,
  }
}