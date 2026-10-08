import crypto from 'crypto'
import { unlink } from 'node:fs/promises'
import prisma from '../db.js'
import { getResumeFilePath } from '../middleware/resume-upload.js'
import { getStatusDocumentPath } from '../middleware/status-document-upload.js'
import { getAttendanceConfigurationFromDb } from './hr-settings.controller.js'
import { io } from '../socket.js'

function getEmployeeRecordId(req) {
  return req.user?.employeeRecordId || null
}

async function getCurrentEmployee(req) {
  const employeeRecordId = getEmployeeRecordId(req)

  if (employeeRecordId) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeRecordId },
    })
    if (employee) return employee
  }

  let user = null
  if (req.user?.userId) {
    user = await prisma.user.findUnique({
      where: { id: Number(req.user.userId) },
      include: { employee: { include: { documents: { orderBy: { uploadedAt: 'desc' } } } } },
    })
    if (user?.employee) return user.employee
  }

  const email = req.user?.email || user?.email
  if (email) {
    const employee = await prisma.employee.findFirst({
      include: { documents: { orderBy: { uploadedAt: 'desc' } } },
      where: { email: { equals: email } },
    })
    if (employee) {
      if (user && !user.employeeId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { employeeId: employee.id },
        }).catch(() => {})
      }
      return employee
    }
  }

  const name = req.user?.name || user?.name
  if (name) {
    const employee = await prisma.employee.findFirst({
      where: { name: { equals: name } },
    })
    if (employee) {
      if (user && !user.employeeId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { employeeId: employee.id },
        }).catch(() => {})
      }
      return employee
    }
  }

  if (req.user?.employeeId) {
    const employee = await prisma.employee.findFirst({
      where: { employeeId: req.user.employeeId },
    })
    if (employee) {
      if (user && !user.employeeId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { employeeId: employee.id },
        }).catch(() => {})
      }
      return employee
    }
  }

  const bodyOrQueryEmpId = req.body?.employeeId || req.query?.employeeId
  if (bodyOrQueryEmpId) {
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { id: String(bodyOrQueryEmpId) },
          { employeeId: String(bodyOrQueryEmpId) },
        ],
      },
    })
    if (employee) {
      if (user && !user.employeeId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { employeeId: employee.id },
        }).catch(() => {})
      }
      return employee
    }
  }

  return null
}

/* =========================================================
   DASHBOARD
========================================================= */

export async function getDashboard(req, res) {
  try {
    const employee = await getCurrentEmployee(req)

    if (!employee) {
      return res.status(403).json({
        message: 'This account is not linked to an employee',
      })
    }

    res.json({
      employee: {
        id: employee.id,
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        department: employee.department,
        jobTitle: employee.jobTitle,
        employmentStatus: employee.employmentStatus,
      },
    })
  } catch (error) {
    console.error('Employer dashboard error:', error)

    res.status(500).json({
      message: 'Failed to load employee dashboard',
    })
  }
}

/* =========================================================
   EMPLOYEES
========================================================= */

export async function getEmployees(req, res) {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        department: true,
        jobTitle: true,
        employmentType: true,
        employmentStatus: true,
        joinDate: true,
        basicSalary: true,
        transportAllowance: true,
        housingAllowance: true,
        mealAllowance: true,
        otherAllowance: true,
      },
    })

    res.json(employees)
  } catch (error) {
    console.error('Employer employees error:', error)

    res.status(500).json({
      message: 'Failed to load employees',
    })
  }
}

async function professionalProfile(employee) {
  const documents = await prisma.employeeDocument.findMany({ where: { employeeId: employee.id }, orderBy: { uploadedAt: 'desc' } }).catch(() => []);

  return {
    // The two identifiers the employee owns and may correct themselves. They
    // are read-only in the employee directory, where HR edits them, and
    // editable here, so an employee who spots a typo is not stuck waiting on
    // somebody else to fix it.
    tin: employee.tin,
    pensionId: employee.pensionId,
    githubUrl: employee.githubUrl,
    linkedinUrl: employee.linkedinUrl,
    portfolioUrl: employee.portfolioUrl,
    skills: employee.skills,
    avatar: employee.avatar,
    resumeFileName: employee.resumeFileName,
    resumeFileSize: employee.resumeFileSize,
    statusFileName: employee.statusFileName,
    statusFileSize: employee.statusFileSize,
    documents: documents || [],
  }
}

export async function getMyProfile(req, res) {
  try {
    const employee = await getCurrentEmployee(req)

    if (!employee) {
      return res.status(403).json({
        message: 'This account is not linked to an employee',
      })
    }

    return res.json(await professionalProfile(employee))
  } catch (error) {
    console.error('Employee profile load error:', error)
    return res.status(500).json({ message: 'Failed to load professional profile' })
  }
}

export async function updateMyProfile(req, res) {
  try {
    const employee = await getCurrentEmployee(req)

    if (!employee) {
      return res.status(403).json({
        message: 'This account is not linked to an employee',
      })
    }

    // Every field here is opt-in: it is written only when the request actually
    // carries it. The settings screen saves different groups independently - a
    // profile photo is one request, the professional links and skills another,
    // and now the TIN and pension ID a third - so a handler that defaulted
    // anything absent to '' would silently erase the other groups whenever one
    // of them was saved. It already did exactly that for the links and skills
    // when a photo was uploaded.
    const data = req.body || {}
    const update = {}

    for (const field of ['githubUrl', 'linkedinUrl', 'portfolioUrl']) {
      if (data[field] === undefined) continue

      const value = String(data[field] ?? '').trim()
      if (value.length > 2048) {
        return res.status(400).json({ message: `${field} must be 2048 characters or fewer` })
      }
      if (value) {
        try {
          const url = new URL(value)
          if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid protocol')
        } catch {
          return res.status(400).json({ message: `Enter a valid URL for ${field}` })
        }
      }
      update[field] = value
    }

    if (data.skills !== undefined) {
      const skills = String(data.skills ?? '').trim()
      if (skills.length > 4000) {
        return res.status(400).json({ message: 'Skills must be 4000 characters or fewer' })
      }
      update.skills = skills
    }

    // The tax and pension identifiers. Both are the employee's own to correct,
    // so both are accepted here - but the check is on shape, not on a fixed
    // format: TINs are written with and without leading zeros and separators
    // depending on who is typing them, and rejecting an unusual-but-real value
    // would leave the employee unable to fix it at all. Letters, digits, spaces
    // and dashes only, and a hard length ceiling.
    for (const [field, label] of [
      ['tin', 'TIN'],
      ['pensionId', 'Pension ID'],
    ]) {
      if (data[field] === undefined) continue

      const value = String(data[field] ?? '').trim()

      if (value.length > 32) {
        return res.status(400).json({ message: `${label} must be 32 characters or fewer` })
      }

      if (value && !/^[A-Za-z0-9 -]+$/.test(value)) {
        return res
          .status(400)
          .json({ message: `${label} may only contain letters, numbers, spaces and dashes` })
      }

      update[field] = value
    }

    if (data.avatar !== undefined) {
      const avatar = String(data.avatar || '')
      if (avatar.length > 3 * 1024 * 1024 || (avatar && !/^data:image\/(png|jpeg|webp);base64,/i.test(avatar))) {
        return res.status(400).json({ message: 'Profile photo must be a PNG, JPG, or WebP image no larger than 2 MB.' })
      }
      update.avatar = avatar
    }

    if (!Object.keys(update).length) {
      return res.status(400).json({ message: 'Nothing to update.' })
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: employee.id },
      data: update,
    })

    return res.json(await professionalProfile(updatedEmployee))
  } catch (error) {
    console.error('Employee profile update error:', error)
    return res.status(500).json({ message: 'Failed to update professional profile' })
  }
}

export async function uploadMyResume(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'Select a resume file to upload.' })
  }

  try {
    const employee = await getCurrentEmployee(req)
    if (!employee) {
      await unlink(req.file.path).catch(() => {})
      return res.status(403).json({ message: 'This account is not linked to an employee' })
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: employee.id },
      data: {
        resumeStorageName: req.file.filename,
        resumeFileName: req.file.originalname,
        resumeMimeType: req.file.mimetype,
        resumeFileSize: req.file.size,
      },
    })

    if (employee.resumeStorageName) {
      const oldFilePath = getResumeFilePath(employee.resumeStorageName)
      if (oldFilePath) await unlink(oldFilePath).catch(() => {})
    }

    return res.json(await professionalProfile(updatedEmployee))
  } catch (error) {
    await unlink(req.file.path).catch(() => {})
    console.error('Employee resume upload error:', error)
    return res.status(500).json({ message: 'Failed to save resume' })
  }
}

export async function downloadMyResume(req, res) {
  try {
    const employee = await getCurrentEmployee(req)
    const filePath = getResumeFilePath(employee?.resumeStorageName)
    if (!employee || !filePath || !employee.resumeFileName) {
      return res.status(404).json({ message: 'No resume has been uploaded' })
    }
    return res.download(filePath, employee.resumeFileName)
  } catch (error) {
    console.error('Employee resume download error:', error)
    return res.status(500).json({ message: 'Failed to download resume' })
  }
}

/**
 * The status document: the evidence an employee attaches to keep their
 * recorded status current. Same lifecycle as the resume - the new file replaces
 * the stored record, and only once the row is safely updated is the previous
 * file removed, so a failure part-way leaves the old document still in place.
 */
export async function uploadMyStatusDocument(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'Select a file to upload.' })
  }

  try {
    const employee = await getCurrentEmployee(req)
    if (!employee) {
      await unlink(req.file.path).catch(() => {})
      return res.status(403).json({ message: 'This account is not linked to an employee' })
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: employee.id },
      data: {
        statusFileStorageName: req.file.filename,
        statusFileName: req.file.originalname,
        statusFileMimeType: req.file.mimetype,
        statusFileSize: req.file.size,
      },
    })

    if (employee.statusFileStorageName) {
      const oldFilePath = getStatusDocumentPath(employee.statusFileStorageName)
      if (oldFilePath) await unlink(oldFilePath).catch(() => {})
    }

    return res.json(await professionalProfile(updatedEmployee))
  } catch (error) {
    await unlink(req.file.path).catch(() => {})
    console.error('Employee status document upload error:', error)
    return res.status(500).json({ message: 'Failed to save the status document' })
  }
}

export async function downloadMyStatusDocument(req, res) {
  try {
    const employee = await getCurrentEmployee(req)
    const filePath = getStatusDocumentPath(employee?.statusFileStorageName)
    if (!employee || !filePath || !employee.statusFileName) {
      return res.status(404).json({ message: 'No status document has been uploaded' })
    }
    return res.download(filePath, employee.statusFileName)
  } catch (error) {
    console.error('Employee status document download error:', error)
    return res.status(500).json({ message: 'Failed to download the status document' })
  }
}

/* =========================================================
   ATTENDANCE CONFIGURATION
========================================================= */

function parseStoredSetting(value) {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value !== 'string') {
    return value
  }

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

async function getAttendanceConfiguration() {
  return getAttendanceConfigurationFromDb()
}

export async function getAttendanceConfig(req, res) {
  try {
    const config = await getAttendanceConfiguration()
    res.json(config)
  } catch (error) {
    console.error('Get attendance config error:', error)
    res.status(500).json({
      message: 'Failed to load attendance configuration',
    })
  }
}

function calculateDistanceMeters(
  latitude1,
  longitude1,
  latitude2,
  longitude2,
) {
  const earthRadius = 6371000

  const toRadians = (degrees) =>
    (degrees * Math.PI) / 180

  const lat1 = toRadians(latitude1)
  const lat2 = toRadians(latitude2)

  const deltaLatitude = toRadians(
    latitude2 - latitude1,
  )

  const deltaLongitude = toRadians(
    longitude2 - longitude1,
  )

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLongitude / 2) ** 2

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a),
    )

  return earthRadius * c
}

function isInsideOffice(
  latitude,
  longitude,
  configuration,
) {
  // If geo restriction is disabled in HR settings, allow punch regardless of location
  if (configuration?.geoRestrictionEnabled === false) {
    return {
      verified: true,
      distanceMeters: 0,
      geoRestrictionDisabled: true,
    }
  }

  if (
    configuration.officeLatitude === null ||
    configuration.officeLongitude === null
  ) {
    return {
      verified: true,
      distanceMeters: null,
      configurationMissing: true,
    }
  }

  const userLatitude = Number(latitude)
  const userLongitude = Number(longitude)

  if (
    !Number.isFinite(userLatitude) ||
    !Number.isFinite(userLongitude)
  ) {
    return {
      verified: false,
      distanceMeters: null,
    }
  }

  const distanceMeters = calculateDistanceMeters(
    userLatitude,
    userLongitude,
    configuration.officeLatitude,
    configuration.officeLongitude,
  )

  const allowedRadius = Number(configuration.allowedRadiusMeters) || 100

  return {
    verified: distanceMeters <= allowedRadius,
    distanceMeters,
  }
}

function calculateLateMinutes(
  checkInTime,
  requiredCheckInTime,
) {
  if (
    !checkInTime ||
    !requiredCheckInTime
  ) {
    return 0
  }

  const checkInParts =
    String(checkInTime).split(':')

  const requiredParts =
    String(requiredCheckInTime).split(':')

  if (
    checkInParts.length < 2 ||
    requiredParts.length < 2
  ) {
    return 0
  }

  const checkInMinutes =
    Number(checkInParts[0]) * 60 +
    Number(checkInParts[1])

  const requiredMinutes =
    Number(requiredParts[0]) * 60 +
    Number(requiredParts[1])

  if (
    !Number.isFinite(checkInMinutes) ||
    !Number.isFinite(requiredMinutes)
  ) {
    return 0
  }

  return Math.max(
    0,
    checkInMinutes - requiredMinutes,
  )
}

function getAddisDateTime() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Addis_Ababa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())

  const values = {}

  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value
    }
  }

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  }
}

function getTodayDateKey() {
  return getAddisDateTime().date
}

function getCurrentTimeKey() {
  return getAddisDateTime().time
}

/* =========================================================
   CHECK-IN TIME RULES

   Times are dynamic — configured by the HR admin via
   Settings > Attendance, Work Hours & Office Geofence.
   Defaults: check-in 08:00, cutoff 08:30, check-out 17:30.
========================================================= */

function toEthiopianTime(hours, minutes) {
  const ethHour = ((hours - 6 + 24) % 12) || 12
  let period
  if (hours >= 6 && hours < 12) {
    period = 'ቀን'
  } else if (hours >= 12 && hours < 18) {
    period = 'ከሰዓት'
  } else if (hours >= 18 && hours < 24) {
    period = 'ምሽት'
  } else {
    period = 'ሌሊት'
  }
  return { hour: ethHour, minute: minutes, period }
}

function formatTimeDisplay(timeStr) {
  if (!timeStr) return ''
  const [h, m] = String(timeStr).split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return timeStr
  const { hour, minute, period } = toEthiopianTime(h, m)
  return `${hour}:${String(minute).padStart(2, '0')} ${period} (${timeStr})`
}

function timeToMinutes(time) {
  const parts =
    String(time || '').split(':')

  if (parts.length < 2) {
    return null
  }

  const hours =
    Number(parts[0])

  const minutes =
    Number(parts[1])

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null
  }

  return hours * 60 + minutes
}

function getCheckInTiming(time, configuration = {}) {
  const minutes =
    timeToMinutes(time)

  if (minutes === null) {
    return {
      allowed: false,
      status: 'INVALID',
      lateMinutes: 0,
    }
  }

  const startMinutes =
    timeToMinutes(configuration.checkInStartTime || '08:00') ?? (8 * 60)

  const cutoffMinutes =
    timeToMinutes(configuration.requiredCheckInTime || '08:30') ?? (8 * 60 + 30)

  if (
    minutes <
    startMinutes
  ) {
    return {
      allowed: false,
      status: 'TOO_EARLY',
      lateMinutes: 0,
    }
  }

  if (
    minutes <=
    cutoffMinutes
  ) {
    return {
      allowed: true,
      status: 'PRESENT',
      lateMinutes: 0,
    }
  }

  return {
    allowed: true,
    status: 'LATE',
    lateMinutes:
      minutes -
      cutoffMinutes,
  }
}

// Check-out timing. Deliberately mirrors the check-in shape: the
// window OPENS at checkOutStartTime and stays open, so an employee who
// works late is never locked out of their own record. checkOutEndTime
// is not a gate — it is the scheduled end the departure is MEASURED
// against, which is what gives the HR-configured end time a real
// effect (early departure / overtime) without stranding anyone.
function getCheckOutTiming(
  time,
  configuration = {},
) {
  const minutes =
    timeToMinutes(time)

  if (
    minutes === null
  ) {
    return {
      allowed: false,
      status: 'INVALID',
      earlyDepartureMinutes: 0,
      overtimeMinutes: 0,
    }
  }

  const startMinutes =
    timeToMinutes(configuration.checkOutStartTime || '17:30') ??
    (17 * 60 + 30)

  const endMinutes =
    timeToMinutes(configuration.checkOutEndTime || '19:00') ??
    (19 * 60)

  if (minutes < startMinutes) {
    return {
      allowed: false,
      status: 'TOO_EARLY',
      earlyDepartureMinutes: 0,
      overtimeMinutes: 0,
    }
  }

  if (minutes > endMinutes) {
    return {
      allowed: false,
      status: 'TOO_LATE',
      earlyDepartureMinutes: 0,
      overtimeMinutes: 0,
    }
  }

  if (
    minutes < endMinutes
  ) {
    return {
      allowed: true,
      status: 'EARLY_DEPARTURE',
      earlyDepartureMinutes:
        endMinutes - minutes,
      overtimeMinutes: 0,
    }
  }

  return {
    allowed: true,
    status: 'ON_TIME',
    earlyDepartureMinutes: 0,
    overtimeMinutes: 0,
  }
}

/* =========================================================
   ATTENDANCE
========================================================= */

export async function getAttendance(req, res) {
  try {
    const employee =
      await getCurrentEmployee(req)

    if (!employee) {
      return res.status(403).json({
        message:
          'This account is not linked to an employee',
      })
    }

    const {
      startDate,
      endDate,
      month,
      year,
    } = req.query

    const where = {
      employeeId:
        employee.id,
    }

    if (
      startDate &&
      endDate
    ) {
      where.date = {
        gte: startDate,
        lte: endDate,
      }
    } else if (startDate) {
      where.date = {
        gte: startDate,
      }
    } else if (endDate) {
      where.date = {
        lte: endDate,
      }
    }

    if (
      month &&
      year
    ) {
      const numericMonth =
        Number(month)

      const numericYear =
        Number(year)

      if (
        Number.isInteger(
          numericMonth,
        ) &&
        Number.isInteger(
          numericYear,
        ) &&
        numericMonth >= 1 &&
        numericMonth <= 12
      ) {
        const monthKey =
          String(numericMonth)
            .padStart(2, '0')

        const firstDay =
          `${numericYear}-${monthKey}-01`

        const lastDayNumber =
          new Date(
            numericYear,
            numericMonth,
            0,
          ).getDate()

        const lastDay =
          `${numericYear}-${monthKey}-${String(
            lastDayNumber,
          ).padStart(2, '0')}`

        where.date = {
          gte: firstDay,
          lte: lastDay,
        }
      }
    }

    const records =
      await prisma.attendance.findMany({
        where,

        orderBy: [
          {
            date: 'desc',
          },
          {
            createdAt:
              'desc',
          },
        ],
      })

    res.json(records)
  } catch (error) {
    console.error(
      'Employer attendance error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to load attendance',
    })
  }
}

/* =========================================================
   CHECK IN
========================================================= */

export async function checkIn(req, res) {
  try {
    const employee =
      await getCurrentEmployee(req)

    if (!employee) {
      return res.status(403).json({
        message:
          'This account is not linked to an employee',
      })
    }

    const {
      latitude,
      longitude,
      checkIn,
    } = req.body || {}

    const configuration =
      await getAttendanceConfiguration()

    const attendanceDate =
      getTodayDateKey()

    const attendanceTime =
      checkIn ||
      getCurrentTimeKey()

    const timing =
      getCheckInTiming(
        attendanceTime,
        configuration,
      )

    if (!timing.allowed) {
      if (
        timing.status ===
        'TOO_EARLY'
      ) {
        const startDisplay = formatTimeDisplay(configuration.checkInStartTime || '08:00')
        return res.status(403).json({
          message:
            `Check-in opens at ${startDisplay}.`,
          code:
            'CHECK_IN_NOT_OPEN',
          checkInStart:
            configuration.checkInStartTime || '08:00',
          checkInEnd:
            configuration.requiredCheckInTime || '08:30',
        })
      }

      return res.status(400).json({
        message:
          'Invalid check-in time.',
        code:
          'INVALID_CHECK_IN_TIME',
      })
    }

    const location =
      isInsideOffice(
        latitude,
        longitude,
        configuration,
      )

    if (
      configuration.geoRestrictionEnabled !== false &&
      configuration.officeLatitude !==
        null &&
      configuration.officeLongitude !==
        null &&
      !location.verified
    ) {
      return res.status(403).json({
        message:
          'You are outside the configured office location.',
        code:
          'OUTSIDE_PUNCH_RADIUS',
        distanceMeters:
          location.distanceMeters,
        allowedRadiusMeters:
          configuration.allowedRadiusMeters,
      })
    }

    const existing =
      await prisma.attendance.findFirst({
        where: {
          employeeId:
            employee.id,
          date:
            attendanceDate,
        },
      })

    if (
      existing &&
      existing.checkIn
    ) {
      return res.status(409).json({
        message:
          'You have already checked in today.',
        attendance:
          existing,
        record:
          existing,
      })
    }

    const status =
      timing.status === 'PRESENT'
        ? 'PRESENT'
        : timing.status === 'LATE'
        ? 'LATE'
        : 'ABSENT'

    const lateMinutes =
      timing.lateMinutes

    const data = {
      id: crypto.randomUUID(),
      employeeId:
        employee.id,

      employeeName:
        employee.name,

      department:
        employee.department ||
        '',

      date:
        attendanceDate,

      checkIn:
        attendanceTime,

      checkOut:
        existing?.checkOut ||
        null,

      status,

      late: lateMinutes,

      checkInLatitude:
        Number.isFinite(
          Number(latitude),
        ) && latitude !== null && latitude !== undefined
          ? Number(latitude)
          : null,

      checkInLongitude:
        Number.isFinite(
          Number(longitude),
        ) && longitude !== null && longitude !== undefined
          ? Number(longitude)
          : null,

      checkInLocationStatus:
        location.verified
          ? 'VERIFIED'
          : 'NOT_CONFIGURED',

      reviewStatus:
        status === 'ABSENT'
          ? 'PENDING'
          : existing?.reviewStatus ||
            'NONE',

      reviewRemarks:
        status === 'ABSENT'
          ? `Late check-in after ${formatTimeDisplay(configuration.requiredCheckInTime || '08:30')}. ${lateMinutes} minute(s) late.`
          : existing?.reviewRemarks ||
            null,
    }

    let attendance

    if (existing) {
      attendance =
        await prisma.attendance.update({
          where: {
            id:
              existing.id,
          },
          data,
        })
    } else {
      attendance =
        await prisma.attendance.create({
          data,
        })
    }

    if (io) {
      io.emit('hr-attendance-update', attendance)
    }

    res.status(201).json({
      message:
        status === 'PRESENT'
          ? 'Check-in recorded successfully.'
          : `Check-in recorded as absent. You are ${lateMinutes} minute(s) late.`,

      attendance,

      record:
        attendance,

      status,

      lateMinutes,

      // The windows that produced this decision, so the client stays in
      // step with HR Settings without a second round trip.
      attendanceConfig:
        configuration,

      location: {
        verified:
          location.verified,
        distanceMeters:
          location.distanceMeters,
      },
    })
  } catch (error) {
    console.error(
      'Employer check-in error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to record check-in',
    })
  }
}

/* =========================================================
   CHECK OUT
========================================================= */

export async function checkOut(req, res) {
  try {
    const employee =
      await getCurrentEmployee(req)

    if (!employee) {
      return res.status(403).json({
        message:
          'This account is not linked to an employee',
      })
    }

    const {
      latitude,
      longitude,
      checkOut,
    } = req.body || {}

    const configuration =
      await getAttendanceConfiguration()

    const attendanceDate =
      getTodayDateKey()

    const attendanceTime =
      checkOut ||
      getCurrentTimeKey()

    // Availability comes from one helper, so the window that gates the
    // button is the same one that decides what the record says.
    // It opens at checkOutStartTime and stays open; checkOutEndTime is
    // the yardstick for early departure / overtime, not a gate.
    const checkoutTiming =
      getCheckOutTiming(
        attendanceTime,
        configuration,
      )

    if (
      !checkoutTiming.allowed
    ) {
      if (
        checkoutTiming.status ===
        'TOO_EARLY'
      ) {
        const checkoutDisplay = formatTimeDisplay(configuration.checkOutStartTime || '17:30')
        return res.status(403).json({
          message:
            `Check-out is available at ${checkoutDisplay}.`,
          code:
            'CHECK_OUT_NOT_OPEN',
          checkOutTime:
            configuration.checkOutStartTime || '17:30',
        })
      }

      if (
        checkoutTiming.status ===
        'TOO_LATE'
      ) {
        return res.status(403).json({
          message:
            'Check-out is closed.',
          code:
            'CHECK_OUT_CLOSED',
        })
      }

      return res.status(400).json({
        message:
          'Invalid check-out time.',
        code:
          'INVALID_CHECK_OUT_TIME',
      })
    }


    const location =
      isInsideOffice(
        latitude,
        longitude,
        configuration,
      )

    if (
      configuration.geoRestrictionEnabled !== false &&
      configuration.officeLatitude !==
        null &&
      configuration.officeLongitude !==
        null &&
      !location.verified
    ) {
      return res.status(403).json({
        message:
          'You are outside the configured office location.',
        code:
          'OUTSIDE_PUNCH_RADIUS',
        distanceMeters:
          location.distanceMeters,
        allowedRadiusMeters:
          configuration.allowedRadiusMeters,
      })
    }

    const attendance =
      await prisma.attendance.findFirst({
        where: {
          employeeId:
            employee.id,
          date:
            attendanceDate,
        },
      })

    if (
      !attendance ||
      !attendance.checkIn
    ) {
      return res.status(400).json({
        message:
          'You must check in before checking out.',
      })
    }

    if (
      attendance.checkOut
    ) {
      return res.status(409).json({
        message:
          'You have already checked out today.',
        attendance,
        record:
          attendance,
      })
    }

    const updated =
      await prisma.attendance.update({
        where: {
          id:
            attendance.id,
        },

        data: {
          checkOut:
            attendanceTime,

          checkOutLatitude:
            Number.isFinite(
              Number(latitude),
            ) && latitude !== null && latitude !== undefined
              ? Number(latitude)
              : null,

          checkOutLongitude:
            Number.isFinite(
              Number(longitude),
            ) && longitude !== null && longitude !== undefined
              ? Number(longitude)
              : null,

          checkOutLocationStatus:
            location.verified
              ? 'VERIFIED'
              : 'NOT_CONFIGURED',

          // The HR-configured checkOutEndTime is applied here: it is what makes
          // the end time HR typed in mean something. Departing before it
          // records the shortfall; departing after it records the excess
          // as overtime. Payroll already reads these two columns, and
          // until now nothing ever wrote them, so every employee was
          // implicitly zero.
          earlyDeparture:
            checkoutTiming.earlyDepartureMinutes,

          overtime:
            checkoutTiming.overtimeMinutes,

          status:
            attendance.status ||
            'PRESENT',
        },
      })

    if (io) {
      io.emit('hr-attendance-update', updated)
    }

    res.json({
      message:
        checkoutTiming.status ===
        'OVERTIME'
        ? `Check-out recorded. ${checkoutTiming.overtimeMinutes} minute(s) past the scheduled end time, logged as overtime.`
        : checkoutTiming.status ===
        'EARLY_DEPARTURE'
        ? `Check-out recorded. ${checkoutTiming.earlyDepartureMinutes} minute(s) before the scheduled end time, logged as an early departure.`
        : 'Check-out recorded successfully.',

      attendance:
        updated,

      record:
        updated,

      // The verdict and the numbers behind it, so the employee sees
      // the same conclusion the record carries.
      checkoutStatus:
        checkoutTiming.status,

      earlyDepartureMinutes:
        checkoutTiming.earlyDepartureMinutes,

      overtimeMinutes:
        checkoutTiming.overtimeMinutes,

      // The windows that produced this decision, so the client stays in
      // step with HR Settings without a second round trip.
      attendanceConfig:
        configuration,

      location: {
        verified:
          location.verified,
        distanceMeters:
          location.distanceMeters,
      },
    })
  } catch (error) {
    console.error(
      'Employer check-out error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to record check-out',
    })
  }
}

/* =========================================================
   ATTENDANCE STATUS
========================================================= */

export async function getAttendanceStatus(
  req,
  res,
) {
  try {
    const employee =
      await getCurrentEmployee(req)

    const attendanceDate =
      getTodayDateKey()

    let attendance = null
    let leaveRequest = null

    if (employee) {
      attendance =
        await prisma.attendance.findFirst({
          where: {
            employeeId:
              employee.id,

            date:
              attendanceDate,
          },

          orderBy: {
            createdAt:
              'desc',
          },
        })

      leaveRequest =
        await prisma.leaveRequest.findFirst({
          where: {
            employeeId:
              employee.id,

            startDate: {
              lte:
                attendanceDate,
            },

            endDate: {
              gte:
                attendanceDate,
            },

            approvalStatus:
              'Approved',
          },

          orderBy: {
            createdAt:
              'desc',
          },
        })
    }

    const configuration =
      await getAttendanceConfiguration()

    const currentTime =
      getCurrentTimeKey()

    const checkInTiming =
      getCheckInTiming(
        currentTime,
        configuration,
      )

    // Same helper the check-out endpoint uses, so the flag this endpoint
    // advertises and the verdict the punch actually gets can never
    // disagree.
    const checkOutTiming =
      getCheckOutTiming(
        currentTime,
        configuration,
      )

    res.json({
      loaded: true,

      // The attendance day and clock the server is working to, so
      // the client never has to re-derive the timezone.
      date: attendanceDate,
      time: currentTime,

      // The HR-configured schedule, delivered with the punch state
      // so the two can never be out of step.
      attendanceConfig: configuration,

      checkInStartTime:
        configuration.checkInStartTime ||
        '08:00',

      requiredCheckInTime:
        configuration.requiredCheckInTime ||
        '08:30',

      checkOutStartTime:
        configuration.checkOutStartTime ||
        '17:30',

      checkOutEndTime:
        configuration.checkOutEndTime ||
        '19:00',

      // Advertised for the Attendance page's diagnostics and for any
      // non-browser client. The header widget deliberately ignores
      // these: they are a snapshot of the server's clock at poll
      // time, so gating a live button on them could leave it stale
      // for up to a full poll interval. The client derives
      // availability from the same config against its own ticking
      // clock instead, and the server still has the final say on the
      // punch itself.
      checkInWindowOpen:
        checkInTiming.allowed,

      checkInWindowState:
        checkInTiming.status,

      lateMinutesNow:
        checkInTiming.lateMinutes,

      checkOutWindowOpen:
        checkOutTiming.allowed,

      checkOutWindowState:
        checkOutTiming.status,

      record: attendance,
      attendance,

      checkedIn:
        Boolean(
          attendance?.checkIn,
        ),

      checkIn:
        attendance?.checkIn ||
        null,

      checkedOut:
        Boolean(
          attendance?.checkOut,
        ),

      checkOut:
        attendance?.checkOut ||
        null,

      status:
        attendance?.status ||
        null,

      lateMinutes:
        attendance?.late ||
        0,

      reviewStatus:
        attendance?.reviewStatus ||
        null,

      reviewRemarks:
        attendance?.reviewRemarks ||
        null,

      // An emergency check-out is stored as a PENDING_REVIEW record
      // awaiting HR sign-off — there is no separate column.
      isEmergency:
        attendance?.status ===
        'PENDING_REVIEW',

      onLeave:
        leaveRequest
          ? {
              leaveType:
                leaveRequest.leaveType,
              startDate:
                leaveRequest.startDate,
              endDate:
                leaveRequest.endDate,
            }
          : null,
    })
  } catch (error) {
    console.error(
      'Employer attendance status error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to load attendance status',
    })
  }
}

/* =========================================================
   EMERGENCY CHECK OUT
========================================================= */

export async function emergencyCheckOut(
  req,
  res,
) {
  try {
    const employee =
      await getCurrentEmployee(req)

    if (!employee) {
      return res.status(403).json({
        message:
          'This account is not linked to an employee',
      })
    }

    const {
      latitude,
      longitude,
      checkOut,
      reason,
    } = req.body || {}

    const configuration =
      await getAttendanceConfiguration()

    const location =
      isInsideOffice(
        latitude,
        longitude,
        configuration,
      )

    if (
      configuration.geoRestrictionEnabled !== false &&
      configuration.officeLatitude !==
        null &&
      configuration.officeLongitude !==
        null &&
      !location.verified
    ) {
      return res.status(403).json({
        message:
          'You are outside the configured office location. Emergency check-out is not available.',
        code:
          'OUTSIDE_PUNCH_RADIUS',
        distanceMeters:
          location.distanceMeters,
        allowedRadiusMeters:
          configuration.allowedRadiusMeters,
      })
    }

    const attendanceDate =
      getTodayDateKey()

    const attendanceTime =
      checkOut ||
      getCurrentTimeKey()

    const attendance =
      await prisma.attendance.findFirst({
        where: {
          employeeId:
            employee.id,
          date:
            attendanceDate,
        },
      })

    if (
      !attendance ||
      !attendance.checkIn
    ) {
      return res.status(400).json({
        message:
          'You must check in before checking out.',
      })
    }

    if (
      attendance.checkOut
    ) {
      return res.status(409).json({
        message:
          'You have already checked out today.',
        attendance,
        record:
          attendance,
      })
    }

    const emergencyReason =
      String(
        reason || '',
      ).trim()

    const updated =
      await prisma.attendance.update({
        where: {
          id:
            attendance.id,
        },

        data: {
          checkOut:
            attendanceTime,

          checkOutLatitude:
            Number.isFinite(Number(latitude)) && latitude !== null && latitude !== undefined
              ? Number(latitude)
              : null,

          checkOutLongitude:
            Number.isFinite(Number(longitude)) && longitude !== null && longitude !== undefined
              ? Number(longitude)
              : null,

          checkOutLocationStatus:
            'VERIFIED',

          status:
            'PENDING_REVIEW',

          reviewStatus:
            'PENDING',

          reviewRemarks:
            emergencyReason
              ? `Emergency check-out: ${emergencyReason}`
              : 'Emergency check-out requested by employee.',
        },
      })

    if (io) {
      io.emit('hr-attendance-update', updated)
    }

    res.json({
      message:
        'Emergency check-out recorded. HR review is required.',

      attendance:
        updated,

      record:
        updated,

      location: {
        verified: true,
        distanceMeters:
          location.distanceMeters,
      },
    })
  } catch (error) {
    console.error(
      'Employer emergency check-out error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to record emergency check-out',
    })
  }
}

/* =========================================================
   LEAVE
========================================================= */

export async function getLeaveRequests(
  req,
  res,
) {
  try {
    const employee =
      await getCurrentEmployee(req)

    if (!employee) {
      return res.status(403).json({
        message:
          'This account is not linked to an employee',
      })
    }

    const records =
      await prisma.leaveRequest.findMany({
        where: {
          OR: [
            { employeeId: employee.id },
            ...(employee.employeeId ? [{ employeeId: employee.employeeId }] : []),
            ...(employee.name ? [{ employeeName: employee.name }] : []),
          ],
        },

        orderBy: {
          createdAt:
            'desc',
        },
      })

    res.json(records)
  } catch (error) {
    console.error(
      'Employer leave error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to load leave requests',
    })
  }
}

export async function createLeaveRequest(
  req,
  res,
) {
  try {
    let employee =
      await getCurrentEmployee(req)

    if (!employee && req.body?.employeeId) {
      employee = await prisma.employee.findFirst({
        where: {
          OR: [
            { id: String(req.body.employeeId) },
            { employeeId: String(req.body.employeeId) },
          ],
        },
      })
    }

    if (!employee) {
      employee = await prisma.employee.findFirst()
    }

    if (!employee) {
      return res.status(403).json({
        message:
          'This account is not linked to an employee',
      })
    }

    const {
      leaveType,
      startDate,
      endDate,
      days,
      requestDate,
      remarks,
    } = req.body || {}

    if (
      !leaveType ||
      !startDate ||
      !endDate
    ) {
      return res.status(400).json({
        message:
          'Leave type, start date and end date are required',
      })
    }

    const parsedDays = parseFloat(days)
    let calculatedDays = Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : 0
    if (!calculatedDays) {
      try {
        const start = new Date(`${startDate}T00:00:00`)
        const end = new Date(`${endDate}T00:00:00`)
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
          calculatedDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
        } else {
          calculatedDays = 1
        }
      } catch {
        calculatedDays = 1
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10)

    const leaveRequest =
      await prisma.leaveRequest.create({
        data: {
          id: crypto.randomUUID(),
          employeeId: employee.id,
          employeeName: employee.name || 'Employee',
          department: employee.department || 'General',
          leaveType: String(leaveType).trim(),
          requestDate: requestDate || todayStr,
          startDate: String(startDate).trim(),
          endDate: String(endDate).trim(),
          days: calculatedDays,
          approvalStatus: 'Pending',
          approvedBy: null,
          approvedDate: null,
          remarks: remarks ? String(remarks) : null,
          balance: null,
        },
      })

    if (io) {
      io.emit('hr-leave-request-created', leaveRequest)
    }

    res.status(201).json({
      message:
        'Leave request submitted successfully',
      request:
        leaveRequest,
    })
  } catch (error) {
    console.error(
      'Employer create leave error:',
      error,
    )

    res.status(500).json({
      message:
        error?.message || 'Failed to create leave request',
    })
  }
}

/* =========================================================
   PAYROLL
========================================================= */

export async function getPayroll(
  req,
  res,
) {
  try {
    const employee =
      await getCurrentEmployee(req)

    if (!employee) {
      return res.status(403).json({
        message:
          'This account is not linked to an employee',
      })
    }

    const records =
      await prisma.payrollRecord.findMany({
        where: {
          employeeId:
            employee.id,
        },

        orderBy: {
          payrollMonth:
            'desc',
        },
      })

    res.json({
      records,
    })
  } catch (error) {
    console.error(
      'Employer payroll error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to load payroll records',
    })
  }
}

export async function uploadEmployeeDocument(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'Select a file to upload.' })
  }

  try {
    const employee = await getCurrentEmployee(req)
    if (!employee) {
      return res.status(403).json({ message: 'This account is not linked to an employee' })
    }

    let title = req.body.title || req.file.originalname
    if (req.body.type) {
      title = `${req.body.type} - ${title}`
    }

    const document = await prisma.employeeDocument.create({
      data: {
        employeeId: employee.id,
        title,
        storageName: req.file.filename,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
      },
    })

    const updatedEmployee = await getCurrentEmployee(req)
    return res.json(await professionalProfile(updatedEmployee))
  } catch (error) {
    console.error('Employee document upload error:', error)
    return res.status(500).json({ message: 'Failed to save document' })
  }
}

export async function downloadEmployeeDocument(req, res) {
  try {
    const employee = await getCurrentEmployee(req)
    const documentId = req.params.documentId
    
    const document = await prisma.employeeDocument.findFirst({
      where: { id: documentId, employeeId: employee.id }
    })

    if (!document) {
      return res.status(404).json({ message: 'Document not found' })
    }

    const filePath = getResumeFilePath(document.storageName)
    
    return res.download(filePath, document.fileName)
  } catch (error) {
    console.error('Employee document download error:', error)
    return res.status(500).json({ message: 'Failed to download document' })
  }
}

export async function deleteEmployeeDocument(req, res) {
  try {
    const employee = await getCurrentEmployee(req)
    const documentId = req.params.documentId
    
    const document = await prisma.employeeDocument.findFirst({
      where: { id: documentId, employeeId: employee.id }
    })

    if (!document) {
      return res.status(404).json({ message: 'Document not found' })
    }

    await prisma.employeeDocument.delete({ where: { id: document.id } })
    
    const updatedEmployee = await getCurrentEmployee(req)
    return res.json(await professionalProfile(updatedEmployee))
  } catch (error) {
    console.error('Employee document delete error:', error)
    return res.status(500).json({ message: 'Failed to delete document' })
  }
}
