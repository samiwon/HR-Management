import { useState, useMemo, useEffect, useCallback } from 'react'
import { Clock, Clock3, LogOut } from 'lucide-react'
import { getWorkEndDisplay, getCheckInCutoffDisplay } from '../lib/workTime'

import DailyLogTable from '../../HR-Manager/components/DailyLogTable'

import {
  EmergencyCheckOutButton,
} from '../components/PunchCard'

import PunchWidget from '../components/PunchWidget'

import { resolveEmployee } from '../lib/currentUser'

import {
  fetchEmployees,
  fetchAttendance,
} from '../lib/employerApi'

import useRealtimeRefetch from '../hooks/useRealtimeRefetch'

function Attendance() {
  const [employees, setEmployees] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)

  const currentEmployee = resolveEmployee(employees)

  /* =========================================================
     LOAD EMPLOYEES + ATTENDANCE
  ========================================================= */

  useEffect(() => {
    let cancelled = false

    Promise.all([
      fetchEmployees(),
      fetchAttendance(),
    ])
      .then(([emps, att]) => {
        if (cancelled) return

        setEmployees(
          Array.isArray(emps)
            ? emps
            : [],
        )

        setAttendance(
          Array.isArray(att)
            ? att
            : att?.attendance || [],
        )
      })
      .catch((error) => {
        console.error(
          'Load attendance error:',
          error,
        )
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  /* =========================================================
     REAL-TIME ATTENDANCE REFRESH
  ========================================================= */

  const reloadAttendance = useCallback(() => {
    fetchAttendance()
      .then((att) => {
        setAttendance(
          Array.isArray(att)
            ? att
            : att?.attendance || [],
        )
      })
      .catch((error) => {
        console.error(
          'Refresh attendance error:',
          error,
        )
      })
  }, [])

  useRealtimeRefetch(
    'attendance',
    reloadAttendance,
  )

  /* =========================================================
     CURRENT EMPLOYEE ATTENDANCE
  ========================================================= */

  const myAttendance = useMemo(() => {
    /*
     * If the current user resolved to a real employee,
     * show only that employee's attendance records.
     *
     * If no employee record exists, fall back to all
     * attendance records so the page does not break.
     */
    if (
      currentEmployee.employeeId !== '—'
    ) {
      return attendance.filter(
        (record) =>
          record.employeeId ===
          currentEmployee.employeeId,
      )
    }

    return attendance
  }, [
    attendance,
    currentEmployee.employeeId,
  ])

  /* =========================================================
     HOURS FORMATTER
  ========================================================= */

  const fmtHours = (hours) => {
    if (
      hours == null ||
      Number.isNaN(Number(hours))
    ) {
      return '0h'
    }

    const value = Number(hours)

    if (value >= 8) {
      const days = value / 8

      return days >= 10
        ? `${days.toFixed(0)}d`
        : `${days.toFixed(1)}d`
    }

    return `${value.toFixed(2)}h`
  }

  /* =========================================================
     STATUS NORMALIZER
  ========================================================= */

  const normalizeStatus = (raw) => {
    const status = String(
      raw || '',
    )
      .trim()
      .toUpperCase()

    if (
      status === 'P' ||
      status === 'PRESENT' ||
      status === 'CHECKED_IN' ||
      status === 'CHECKED_OUT'
    ) {
      return 'present'
    }

    if (status === 'PH') {
      return 'present'
    }

    if (
      status === 'A' ||
      status === 'ABSENT'
    ) {
      return 'absent'
    }

    if (
      status === 'SL' ||
      status === 'SICK' ||
      status === 'SICK_LEAVE' ||
      status === 'SICKLEAVE' ||
      status === 'SICK LEAVE'
    ) {
      return 'sick'
    }

    if (
      status === 'AL' ||
      status === 'ANNUAL_LEAVE' ||
      status === 'ANNUALLEAVE' ||
      status === 'ON_LEAVE' ||
      status === 'ANNUAL LEAVE'
    ) {
      return 'on_leave'
    }

    if (
      status === 'ML' ||
      status === 'MEDICAL_LEAVE' ||
      status === 'MEDICALLEAVE' ||
      status === 'MEDICAL LEAVE'
    ) {
      return 'on_leave'
    }

    if (
      status === 'OL' ||
      status === 'OTHER_LEAVE' ||
      status === 'OTHERLEAVE' ||
      status === 'OTHER LEAVE' ||
      status === 'LEAVE'
    ) {
      return 'on_leave'
    }

    return 'unknown'
  }

  /* =========================================================
     ATTENDANCE TOTALS
  ========================================================= */

  const totals = useMemo(() => {
    const result = {
      regular: 0,
      overtime: 0,
      late: 0,
      present: 0,
      absent: 0,
      sick: 0,
    }

    myAttendance.forEach((record) => {
      result.regular += Number(
        record.regular || 0,
      )

      result.overtime += Number(
        record.overtime || 0,
      )

      result.late += Number(
        record.late || 0,
      )

      const status = normalizeStatus(
        record.status,
      )

      if (status === 'present') {
        result.present += 1
      } else if (status === 'absent') {
        result.absent += 1
      } else if (status === 'sick') {
        result.sick += 1
      }
    })

    return result
  }, [myAttendance])

  /* =========================================================
     EMPLOYEE HOURS TOTAL
  ========================================================= */

  const myTotal = useMemo(() => {
    return myAttendance.reduce(
      (result, record) => {
        const status = normalizeStatus(
          record.status,
        )

        if (
          status === 'present' ||
          status === 'on_leave'
        ) {
          result.days += 1

          result.totalHours += Number(
            record.regular || 0,
          )

          result.totalOtHours += Number(
            record.overtime || 0,
          )
        } else {
          result.absences += 1
        }

        return result
      },
      {
        days: 0,
        totalHours: 0,
        totalOtHours: 0,
        absences: 0,
      },
    )
  }, [myAttendance])

  /* =========================================================
     PUNCH STATISTICS
  ========================================================= */

  const punchStats = useMemo(() => {
    const presentDays =
      myAttendance.filter(
        (record) =>
          normalizeStatus(
            record.status,
          ) === 'present',
      )

    const lateSum =
      presentDays.reduce(
        (sum, record) =>
          sum +
          Number(
            record.late || 0,
          ),
        0,
      )

    const earlySum =
      presentDays.reduce(
        (sum, record) =>
          sum +
          Number(
            record.earlyDeparture || 0,
          ),
        0,
      )

    const overtimeHours =
      Math.round(
        myAttendance.reduce(
          (sum, record) =>
            sum +
            Number(
              record.overtime || 0,
            ),
          0,
        ) * 10,
      ) / 10

    return {
      avgLateMin:
        presentDays.length
          ? Math.round(
              lateSum /
                presentDays.length,
            )
          : 0,

      avgEarlyMin:
        presentDays.length
          ? Math.round(
              earlySum /
                presentDays.length,
            )
          : 0,

      overtimeHours,
    }
  }, [myAttendance])

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div>
          <div className="flex items-center gap-2">

            <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-100">
              My Attendance
            </h1>

            <span className="text-[11px] font-bold text-gray-500 bg-gray-100 dark:bg-[#1c2026] dark:text-gray-400 border border-gray-200 dark:border-[#262b31] px-2 py-0.5 rounded-md">
              {currentEmployee.name}{' '}
              ({currentEmployee.employeeId})
            </span>

          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Personal punch log, scheduled shifts &amp;
            overtime hours computed automatically
          </p>
        </div>

        {/* =================================================
            PUNCH ACTIONS
        ================================================= */}

        <div className="flex flex-wrap items-center gap-2">

          <PunchWidget />

          <EmergencyCheckOutButton />

        </div>

      </div>

      {/* =====================================================
          LOADING
      ===================================================== */}

      {loading ? (
        <div className="py-20 text-center text-xs font-semibold text-gray-400">
          Loading attendance…
        </div>
      ) : (
        <>

          {/* =================================================
              SUMMARY STATS
          ================================================= */}

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">

            {[
              {
                label: 'Present Days',
                value: totals.present,
                color: 'text-emerald-600',
              },

              {
                label: 'Absent Days',
                value: totals.absent,
                color: 'text-rose-600',
              },

              {
                label: 'Sick Days',
                value: totals.sick,
                color: 'text-teal-600',
              },

              {
                label: 'Regular Hours',
                value: fmtHours(
                  totals.regular,
                ),
                color:
                  'text-gray-950 dark:text-gray-100',
              },

              {
                label: 'Overtime Hours',
                value: fmtHours(
                  totals.overtime,
                ),
                color: 'text-indigo-600',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-2xs dark:bg-[#15181d] dark:border-[#262b31]"
              >
                <p
                  className={`text-lg font-bold ${stat.color}`}
                >
                  {stat.value}
                </p>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {stat.label}
                </p>
              </div>
            ))}

          </div>

          {/* =================================================
              PUNCH STATUS CARDS
          ================================================= */}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Average Late */}

            <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-2xs dark:bg-[#15181d] dark:border-[#262b31]">

              <div className="flex items-center justify-between gap-2">

                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Avg Late Time
                </p>

                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 flex items-center justify-center">
                  <Clock3 size={14} />
                </div>

              </div>

              <p className="text-xl font-bold text-gray-950 dark:text-gray-100 mt-1 tabular-nums">
                {punchStats.avgLateMin}m
              </p>

              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                Average minutes past {getCheckInCutoffDisplay()}
              </p>

            </div>

            {/* Average Early Departure */}

            <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-2xs dark:bg-[#15181d] dark:border-[#262b31]">

              <div className="flex items-center justify-between gap-2">

                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Avg Early Departure
                </p>

                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 flex items-center justify-center">
                  <LogOut size={14} />
                </div>

              </div>

              <p className="text-xl font-bold text-gray-950 dark:text-gray-100 mt-1 tabular-nums">
                {punchStats.avgEarlyMin}m
              </p>

              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                Average minutes before {getWorkEndDisplay()}
              </p>

            </div>

            {/* Overtime */}

            <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-2xs dark:bg-[#15181d] dark:border-[#262b31]">

              <div className="flex items-center justify-between gap-2">

                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Overtime
                </p>

                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 flex items-center justify-center">
                  <Clock size={14} />
                </div>

              </div>

              <p className="text-xl font-bold text-gray-950 dark:text-gray-100 mt-1 tabular-nums">
                {punchStats.overtimeHours}h
              </p>

              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                All records
              </p>

            </div>

          </div>


          {/* =================================================
              HOURS SUMMARY
          ================================================= */}

          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-5 dark:bg-[#15181d] dark:border-[#262b31] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

            <div>

              <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100">
                Hours Summary
              </h3>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Verified working days and overtime
                submitted to payroll for disbursement.
              </p>

            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">

              {/* Worked Days */}

              <div className="bg-slate-50 dark:bg-[#1c2026] border border-slate-200 dark:border-[#262b31] px-3 py-2 rounded-xl">

                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                  Worked Days
                </span>

                <span className="font-bold text-slate-800 dark:text-gray-100 text-sm">
                  {myTotal.days}
                </span>

              </div>

              {/* Total Hours */}

              <div className="bg-slate-50 dark:bg-[#1c2026] border border-slate-200 dark:border-[#262b31] px-3 py-2 rounded-xl">

                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                  Total Hours
                </span>

                <span className="font-bold text-slate-800 dark:text-gray-100 text-sm">
                  {myTotal.totalHours}h
                </span>

              </div>

              {/* Overtime */}

              <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 px-3 py-2 rounded-xl">

                <span className="text-indigo-600 dark:text-indigo-400 text-[10px] uppercase font-bold block">
                  Overtime
                </span>

                <span className="font-bold text-indigo-700 dark:text-indigo-300 text-sm">
                  {myTotal.totalOtHours}h
                </span>

              </div>

            </div>

          </div>

          {/* =================================================
              DAILY LOG
          ================================================= */}

          <section id="daily-log-section">

            <DailyLogTable
              initialLogs={myAttendance}
              employees={[
                currentEmployee,
              ]}
              title="My Daily Log"
              subtitle={`Check-in and punch records for ${currentEmployee.name}`}
              showActions={false}
              tableId="employer-daily-log-table"
            />

          </section>

        </>
      )}

    </div>
  )
}

export default Attendance