import crypto from 'node:crypto'
import { access } from 'node:fs/promises'
import prisma from '../db.js'
import { getResumeFilePath } from '../middleware/resume-upload.js'
import { getAttendanceConfigurationFromDb } from './hr-settings.controller.js'
import { hashPassword } from '../utils/security.js'

/**
 * A generated password must not be ambiguous to retype, and must be strong
 * enough that a shared one is not a liability.
 */
function generateTemporaryPassword() {
  return crypto.randomBytes(12).toString('base64url')
}

const n = (value, fallback = 0) => {
  const result = Number(value)
  return Number.isFinite(result) ? result : fallback
}
const s = (value, fallback = '') => value == null ? fallback : String(value)
const today = (value) => s(value, new Date().toISOString().slice(0, 10))
const fail = (res, error, message) => {
  console.error(message, error)
  return res.status(500).json({ message })
}

async function employeeById(value) {
  if (!value) return null
  return prisma.employee.findFirst({ where: { OR: [{ id: value }, { employeeId: value }] } })
}

function employeeValues(input, current = {}) {
  const data = input || {}
  const salary = n(data.salary, n(data.basicSalary, current.salary))
  return {
    employeeId: data.employeeId ?? current.employeeId ?? '', name: data.name ?? current.name ?? '',
    gender: data.gender ?? current.gender ?? '', dateOfBirth: data.dateOfBirth ?? current.dateOfBirth ?? '',
    joinDate: data.joinDate ?? current.joinDate ?? '', jobTitle: data.jobTitle ?? current.jobTitle ?? '',
    department: data.department ?? current.department ?? '', employmentType: data.employmentType ?? current.employmentType ?? '',
    basicSalary: n(data.basicSalary, current.basicSalary), transportAllowance: n(data.transportAllowance, current.transportAllowance),
    housingAllowance: n(data.housingAllowance, current.housingAllowance), mealAllowance: n(data.mealAllowance, current.mealAllowance),
    otherAllowance: n(data.otherAllowance, current.otherAllowance), otherDeductions: n(data.otherDeductions, current.otherDeductions),
    loanDeductions: n(data.loanDeductions, current.loanDeductions), bankName: data.bankName ?? current.bankName ?? '',
    bankAccount: data.bankAccount ?? current.bankAccount ?? '', tin: data.tin ?? current.tin ?? '', pensionId: data.pensionId ?? current.pensionId ?? '',
    phone: data.phone ?? current.phone ?? '', ethioTelecomPhone: data.ethioTelecomPhone ?? current.ethioTelecomPhone ?? '', email: data.email ?? current.email ?? '', address: data.address ?? current.address ?? '',
    emergencyContact: data.emergencyContact ?? current.emergencyContact ?? '', employmentStatus: data.employmentStatus ?? data.status ?? current.employmentStatus ?? 'Active',
    exitDate: data.exitDate !== undefined ? data.exitDate || null : current.exitDate ?? null, notes: data.notes ?? current.notes ?? '',
    status: data.status ?? data.employmentStatus ?? current.status ?? 'Active', avatar: data.avatar ?? current.avatar ?? '',
    location: data.location ?? current.location ?? '', salary, manager: data.manager ?? current.manager ?? '',
    roleType: data.roleType ?? current.roleType ?? '', initials: data.initials ?? current.initials ?? '',
    githubUrl: data.githubUrl ?? current.githubUrl ?? '', linkedinUrl: data.linkedinUrl ?? current.linkedinUrl ?? '',
    portfolioUrl: data.portfolioUrl ?? current.portfolioUrl ?? '', skills: data.skills ?? current.skills ?? '',
  }
}

export async function getDashboard(_req, res) {
  try {
    const [totalEmployees, activeEmployees, employeesOnLeave, departments, archivedEmployees] = await Promise.all([
      prisma.employee.count({ where: { isArchived: false } }),
      prisma.employee.count({ where: { employmentStatus: 'Active', isArchived: false } }),
      prisma.employee.count({ where: { employmentStatus: 'On Leave', isArchived: false } }),
      prisma.employee.findMany({ where: { isArchived: false }, select: { department: true }, distinct: ['department'] }),
      prisma.employee.count({ where: { isArchived: true } }),
    ])
    return res.json({ totalEmployees, activeEmployees, employeesOnLeave, departments: departments.length, archivedEmployees })
  } catch (error) { return fail(res, error, 'Failed to load HR dashboard') }
}

export async function getEmployees(_req, res) {
  try { return res.json(await prisma.employee.findMany({ orderBy: { createdAt: 'desc' } })) }
  catch (error) { return fail(res, error, 'Failed to load employees') }
}

export async function getEmployee(req, res) {
  try {
    const employee = await prisma.employee.findUnique({ where: { id: req.params.id } })
    if (!employee) return res.status(404).json({ message: 'Employee not found' })
    return res.json(employee)
  } catch (error) { return fail(res, error, 'Failed to load employee') }
}

export async function downloadEmployeeResume(req, res) {
  try {
    if (!['HR_MANAGER', 'ADMIN'].includes(req.user?.role)) {
      return res.status(403).json({ message: 'Only HR administrators can view employee resumes' })
    }

    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      select: { resumeStorageName: true, resumeFileName: true },
    })
    const filePath = getResumeFilePath(employee?.resumeStorageName)
    if (!employee?.resumeFileName || !filePath) {
      return res.status(404).json({ message: 'No resume has been uploaded' })
    }
    await access(filePath)
    return res.download(filePath, employee.resumeFileName)
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ message: 'Resume file was not found' })
    return fail(res, error, 'Failed to download employee resume')
  }
}

export async function createEmployee(req, res) {
  try {
    const data = req.body || {}
    if (!data.employeeId || !data.name || !data.email) return res.status(400).json({ message: 'Employee ID, name, and email are required' })

    // The address the HR Admin typed is the employee's login, full stop.
    //
    // It is not checked for being real or external, and nothing is ever sent
    // to it. A company address such as john.doe@yanoltech.com is a normal
    // thing to enter here, so the only requirement is that there is one.
    const email = data.email

    const [employeeExists, userExists, employeeEmailExists] = await Promise.all([
      prisma.employee.findUnique({ where: { employeeId: data.employeeId } }),
      prisma.user.findUnique({ where: { email } }),
      prisma.employee.findFirst({ where: { email, ...(data.id ? { NOT: { id: data.id } } : {}) } }),
    ])
    if (employeeExists) return res.status(409).json({ message: 'Employee ID already exists' })
    if (userExists?.employeeId) return res.status(409).json({ message: 'An account with this email is already linked to an employee' })
    if (userExists) return res.status(409).json({ message: 'An account with this email already exists' })
    if (employeeEmailExists) return res.status(409).json({ message: 'Another employee already uses this email address' })
    const temporaryPassword = generateTemporaryPassword()
    const hashedTemporaryPassword = await hashPassword(temporaryPassword)
    const result = await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({ data: { id: crypto.randomUUID(), ...employeeValues(data) } })
      const user = userExists
        ? await tx.user.update({
            where: { id: userExists.id },
            data: { name: employee.name, password: hashedTemporaryPassword, mustChangePassword: true, role: 'EMPLOYEE', employeeId: employee.id },
          })
        : await tx.user.create({ data: { name: employee.name, email: employee.email, password: hashedTemporaryPassword, mustChangePassword: true, role: 'EMPLOYEE', employeeId: employee.id } })
      const payrollMonth = new Date().toISOString().slice(0, 7)
      await tx.payrollRecord.create({
        data: {
          id: crypto.randomUUID(), employeeId: employee.id, employeeName: employee.name,
          department: employee.department, payrollMonth,
          basicSalary: employee.basicSalary, transportAllowance: employee.transportAllowance,
          housingAllowance: employee.housingAllowance, mealAllowance: employee.mealAllowance,
          otherAllowance: employee.otherAllowance, overtimePay: 0,
          grossSalary: employee.basicSalary + employee.transportAllowance + employee.housingAllowance + employee.mealAllowance + employee.otherAllowance,
          pensionDeduction: 0, incomeTax: 0, loanDeduction: employee.loanDeductions,
          otherDeduction: employee.otherDeductions, totalDeductions: employee.loanDeductions + employee.otherDeductions,
          netSalary: employee.basicSalary + employee.transportAllowance + employee.housingAllowance + employee.mealAllowance + employee.otherAllowance - employee.loanDeductions - employee.otherDeductions,
          employerPension: 0, employerCost: employee.basicSalary + employee.transportAllowance + employee.housingAllowance + employee.mealAllowance + employee.otherAllowance,
        },
      })
      return { employee, user }
    })
    // The temporary password is handed straight back to the authenticated HR
    // Admin. It is never emailed - the address belongs to the company and there
    // is no inbox behind it - so this response is the only way it reaches the
    // employee, via the person onboarding them.
    return res.status(201).json({
      employee: result.employee,
      account: {
        email: result.user.email,
        temporaryPassword,
      },
      message: 'Employee and employee login account created successfully',
    })
  } catch (error) { return fail(res, error, 'Failed to create employee') }
}

export async function updateEmployee(req, res) {
  try {
    const current = await prisma.employee.findUnique({ where: { id: req.params.id } })
    if (!current) return res.status(404).json({ message: 'Employee not found' })
    const data = req.body || {}
    if (data.employeeId && data.employeeId !== current.employeeId && await prisma.employee.findUnique({ where: { employeeId: data.employeeId } })) return res.status(409).json({ message: 'Employee ID already exists' })

    // A changed address is still checked for collisions, because the account
    // row is keyed on it. No format check: the address is whatever the HR Admin
    // entered.
    //
    // A blank field on an unrelated edit must not wipe it. employeeValues
    // coalesces with ??, and '' is not nullish, so without this an omitted or
    // cleared field would store an empty address - the employee's login
    // identity, gone. Keeping what they already have is not a second way to
    // set the address; it is just declining to destroy one.
    if (data.email) {
      const email = data.email
      if (email !== current.email) {
        if (await prisma.user.findUnique({ where: { email } })) return res.status(409).json({ message: 'An account with this email already exists' })
        if (await prisma.employee.findFirst({ where: { email, NOT: { id: current.id } } })) return res.status(409).json({ message: 'Another employee already uses this email address' })
      }
      data.email = email
    } else if (current.email) {
      data.email = current.email
    }

    const employee = await prisma.employee.update({ where: { id: current.id }, data: employeeValues(data, current) })
    if (data.email && data.email !== current.email) await prisma.user.updateMany({ where: { employeeId: current.id }, data: { email: data.email, name: employee.name } })
    return res.json(employee)
  } catch (error) { return fail(res, error, 'Failed to update employee') }
}

export async function deleteEmployee(req, res) {
  try {
    const employee = await prisma.employee.findUnique({ where: { id: req.params.id } })
    if (!employee) return res.status(404).json({ message: 'Employee not found' })

    const terminatedAt = new Date()

    // Soft-delete / Archive the employee: do not permanently delete.
    // Sets status to 'Terminated', isArchived to true, and preserves all historical records.
    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: employee.id },
        data: {
          isArchived: true,
          archivedAt: terminatedAt,
          status: 'Terminated',
          employmentStatus: 'Terminated',
          exitDate: employee.exitDate || today(),
        },
      })
      await tx.user.updateMany({
        where: { employeeId: employee.id },
        data: { isActive: false },
      })
    })

    return res.json({
      message: 'Employee terminated and archived successfully. All historical records have been preserved.',
      archived: true,
      employeeId: employee.id,
      status: 'Terminated',
      isArchived: true,
      terminatedAt: terminatedAt.toISOString(),
    })
  } catch (error) { return fail(res, error, 'Failed to terminate employee') }
}

export async function restoreEmployee(req, res) {
  try {
    const employee = await prisma.employee.findUnique({ where: { id: req.params.id } })
    if (!employee) return res.status(404).json({ message: 'Employee not found' })

    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: employee.id },
        data: {
          isArchived: false,
          archivedAt: null,
          status: 'Active',
          employmentStatus: 'Active',
          exitDate: null,
        },
      })
      await tx.user.updateMany({
        where: { employeeId: employee.id },
        data: { isActive: true },
      })
    })

    return res.json({
      message: 'Employee restored successfully.',
      archived: false,
      employeeId: employee.id,
    })
  } catch (error) { return fail(res, error, 'Failed to restore employee') }
}

export async function resetEmployeePassword(req, res) {
  try {
    if (req.user && !['HR_MANAGER', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only HR administrators can reset employee passwords' })
    }
    const employee = await prisma.employee.findUnique({ where: { id: req.params.id } })
    if (!employee) return res.status(404).json({ message: 'Employee not found' })
    const user = await prisma.user.findUnique({ where: { employeeId: employee.id } })
    if (!user) return res.status(404).json({ message: 'Employee login account not found' })

    const temporaryPassword = generateTemporaryPassword()
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await hashPassword(temporaryPassword),
        mustChangePassword: true,
      },
    })

    // As with creation, the new password goes back to the HR Admin to pass on.
    // Nothing is sent to the employee's address.
    return res.json({
      email: user.email,
      temporaryPassword,
      message: 'Temporary password reset successfully',
    })
  } catch (error) { return fail(res, error, 'Failed to reset employee password') }
}

async function attendanceConfig() {
  return getAttendanceConfigurationFromDb()
}

function distance(a, b, c, d) {
  const r = (value) => value * Math.PI / 180
  const x = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}
function locationStatus(latitude, longitude, config) {
  if (config?.geoRestrictionEnabled === false) {
    return { verified: true, distanceMeters: 0, geoRestrictionDisabled: true }
  }
  const lat = Number(latitude), lon = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || config.officeLatitude == null || config.officeLongitude == null) return { verified: true, distanceMeters: null }
  const distanceMeters = distance(lat, lon, config.officeLatitude, config.officeLongitude)
  return { verified: distanceMeters <= config.allowedRadiusMeters, distanceMeters }
}
function lateMinutes(checkIn, required) {
  const toMinutes = (value) => {
    if (value instanceof Date) return value.getHours() * 60 + value.getMinutes()
    const text = s(value).trim()
    const match = text.match(/(?:T|\b)(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i)
    if (!match) return null
    let hour = Number(match[1])
    const minute = Number(match[2])
    if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour > 23 || minute > 59) return null
    const meridiem = match[3]?.toUpperCase()
    if (meridiem) hour = (hour % 12) + (meridiem === 'PM' ? 12 : 0)
    return hour * 60 + minute
  }
  const actual = toMinutes(checkIn)
  const cutoff = toMinutes(required)
  if (actual == null || cutoff == null) return 0
  return Math.max(0, actual - cutoff)
}

export async function getAttendance(req, res) {
  try {
    const { date, startDate, endDate } = req.query
    const where = date ? { date } : startDate || endDate ? { date: { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) } } : undefined
    return res.json(await prisma.attendance.findMany({ where, orderBy: [{ date: 'desc' }, { employeeName: 'asc' }] }))
  } catch (error) { return fail(res, error, 'Failed to load attendance records') }
}
export async function getAttendanceRecord(req, res) {
  try { const record = await prisma.attendance.findUnique({ where: { id: req.params.id } }); if (!record) return res.status(404).json({ message: 'Attendance record not found' }); return res.json(record) }
  catch (error) { return fail(res, error, 'Failed to load attendance record') }
}

function attendanceValues(data, employee, current = {}, config = {}) {
  const checkIn = data.checkIn ?? current.checkIn ?? null
  const requiredCheckInTime = data.requiredCheckInTime ?? config.requiredCheckInTime ?? current.requiredCheckInTime ?? null
  const late = checkIn && requiredCheckInTime
    ? lateMinutes(checkIn, requiredCheckInTime)
    : n(data.late, current.late)
  return { employeeId: employee.id, employeeName: data.employeeName ?? employee.name, department: data.department ?? employee.department, date: data.date ?? current.date, status: data.status ?? current.status, checkIn, checkOut: data.checkOut ?? current.checkOut ?? null, requiredCheckInTime, late, earlyDeparture: n(data.earlyDeparture, current.earlyDeparture), regular: n(data.regular, current.regular), overtime: n(data.overtime, current.overtime) }
}
export async function createAttendance(req, res) {
  try {
    const data = req.body || {}, employee = await employeeById(data.employeeId)
    if (!employee || !data.date || !data.status) return res.status(400).json({ message: 'Employee, date, and status are required' })
    if (await prisma.attendance.findFirst({ where: { employeeId: employee.id, date: data.date } })) return res.status(409).json({ message: 'Attendance record already exists for this employee and date' })
    const config = await attendanceConfig()
    const record = await prisma.attendance.create({ data: { id: data.id || crypto.randomUUID(), ...attendanceValues(data, employee, {}, config) } })
    return res.status(201).json(record)
  } catch (error) { return fail(res, error, 'Failed to create attendance record') }
}
export async function updateAttendance(req, res) {
  try {
    const current = await prisma.attendance.findUnique({ where: { id: req.params.id } }), data = req.body || {}
    if (!current) return res.status(404).json({ message: 'Attendance record not found' })
    const employee = await employeeById(data.employeeId || current.employeeId)
    if (!employee) return res.status(400).json({ message: 'Employee not found' })
    const config = await attendanceConfig()
    const record = await prisma.attendance.update({ where: { id: current.id }, data: attendanceValues(data, employee, current, config) })
    return res.json(record)
  } catch (error) { return fail(res, error, 'Failed to update attendance record') }
}
export async function deleteAttendance(req, res) {
  try { const current = await prisma.attendance.findUnique({ where: { id: req.params.id } }); if (!current) return res.status(404).json({ message: 'Attendance record not found' }); await prisma.attendance.delete({ where: { id: current.id } }); return res.json({ message: 'Attendance record deleted successfully' }) }
  catch (error) { return fail(res, error, 'Failed to delete attendance record') }
}

export async function employeeCheckIn(req, res) {
  try {
    const data = req.body || {}, employee = await employeeById(data.employeeId)
    if (!employee) return res.status(404).json({ message: 'Employee not found' })
    const date = today(data.date)
    if (await prisma.attendance.findFirst({ where: { employeeId: employee.id, date } })) return res.status(409).json({ message: 'Attendance already exists for this employee and date' })
    const config = await attendanceConfig(), checkIn = data.checkIn || new Date().toTimeString().slice(0, 5), late = lateMinutes(checkIn, config.requiredCheckInTime), location = locationStatus(data.latitude, data.longitude, config)
    const record = await prisma.attendance.create({ data: { id: crypto.randomUUID(), employeeId: employee.id, employeeName: employee.name, department: employee.department, date, status: late ? 'Late' : 'Present', checkIn, late, checkInLatitude: Number.isFinite(Number(data.latitude)) ? Number(data.latitude) : null, checkInLongitude: Number.isFinite(Number(data.longitude)) ? Number(data.longitude) : null, checkInLocationStatus: location.verified ? 'Verified' : 'Unverified', requiredCheckInTime: config.requiredCheckInTime } })
    return res.status(201).json({ attendance: record, location, message: 'Check-in recorded successfully' })
  } catch (error) { return fail(res, error, 'Failed to record employee check-in') }
}
export async function employeeCheckOut(req, res) {
  try {
    const data = req.body || {}, employee = await employeeById(data.employeeId)
    if (!employee) return res.status(404).json({ message: 'Employee not found' })
    const record = await prisma.attendance.findFirst({ where: { employeeId: employee.id, date: today(data.date) } })
    if (!record) return res.status(404).json({ message: 'Check-in record not found' })
    const location = locationStatus(data.latitude, data.longitude, await attendanceConfig()), updated = await prisma.attendance.update({ where: { id: record.id }, data: { checkOut: data.checkOut || new Date().toTimeString().slice(0, 5), checkOutLatitude: Number.isFinite(Number(data.latitude)) ? Number(data.latitude) : null, checkOutLongitude: Number.isFinite(Number(data.longitude)) ? Number(data.longitude) : null, checkOutLocationStatus: location.verified ? 'Verified' : 'Unverified' } })
    return res.json({ attendance: updated, location, message: 'Check-out recorded successfully' })
  } catch (error) { return fail(res, error, 'Failed to record employee check-out') }
}
export async function acceptLateAttendance(req, res) {
  try { const current = await prisma.attendance.findUnique({ where: { id: req.params.id } }); if (!current) return res.status(404).json({ message: 'Attendance record not found' }); return res.json(await prisma.attendance.update({ where: { id: current.id }, data: { reviewStatus: 'Approved', reviewedBy: req.user?.name || 'HR Manager', reviewedAt: new Date().toISOString(), reviewRemarks: req.body?.remarks || null } })) }
  catch (error) { return fail(res, error, 'Failed to approve late attendance') }
}

export async function getLeaveRequests(req, res) {
  try { const where = req.query.employeeId ? { employeeId: req.query.employeeId } : undefined; return res.json(await prisma.leaveRequest.findMany({ where, include: { employee: true }, orderBy: { createdAt: 'desc' } })) }
  catch (error) { return fail(res, error, 'Failed to load leave requests') }
}
export async function getLeaveRequest(req, res) {
  try { const request = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } }); if (!request) return res.status(404).json({ message: 'Leave request not found' }); return res.json(request) }
  catch (error) { return fail(res, error, 'Failed to load leave request') }
}
export async function createLeaveRequest(req, res) {
  try {
    const data = req.body || {}, employee = await employeeById(data.employeeId)
    if (!employee || !data.leaveType || !data.startDate || !data.endDate) return res.status(400).json({ message: 'Employee, leave type, start date, and end date are required' })
    const days = n(data.days, Math.max(1, Math.ceil((new Date(data.endDate) - new Date(data.startDate)) / 86400000) + 1))
    const request = await prisma.leaveRequest.create({ data: { id: data.id || crypto.randomUUID(), employeeId: employee.id, employeeName: employee.name, department: employee.department, leaveType: data.leaveType, requestDate: today(data.requestDate), startDate: data.startDate, endDate: data.endDate, days, approvalStatus: data.approvalStatus || 'Pending', approvedBy: data.approvedBy || null, approvedDate: data.approvedDate || null, remarks: data.remarks || null, rejectionReason: data.rejectionReason || null, balance: data.balance == null ? null : n(data.balance) } })
    return res.status(201).json(request)
  } catch (error) { return fail(res, error, 'Failed to create leave request') }
}
export async function updateLeaveRequest(req, res) {
  try {
    const current = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } }), data = req.body || {}
    if (!current) return res.status(404).json({ message: 'Leave request not found' })
    const request = await prisma.leaveRequest.update({ where: { id: current.id }, data: { leaveType: data.leaveType ?? current.leaveType, requestDate: data.requestDate ?? current.requestDate, startDate: data.startDate ?? current.startDate, endDate: data.endDate ?? current.endDate, days: n(data.days, current.days), approvalStatus: data.approvalStatus ?? current.approvalStatus, approvedBy: data.approvedBy ?? current.approvedBy, approvedDate: data.approvedDate ?? current.approvedDate, remarks: data.remarks ?? current.remarks, rejectionReason: data.rejectionReason === undefined ? current.rejectionReason : data.rejectionReason || null, balance: data.balance === undefined ? current.balance : data.balance == null ? null : n(data.balance) } })
    return res.json(request)
  } catch (error) { return fail(res, error, 'Failed to update leave request') }
}
export async function deleteLeaveRequest(req, res) {
  try { const current = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } }); if (!current) return res.status(404).json({ message: 'Leave request not found' }); await prisma.leaveRequest.delete({ where: { id: current.id } }); return res.json({ message: 'Leave request deleted successfully' }) }
  catch (error) { return fail(res, error, 'Failed to delete leave request') }
}

const payrollFields = ['basicSalary', 'transportAllowance', 'housingAllowance', 'mealAllowance', 'otherAllowance', 'overtimePay', 'grossSalary', 'pensionDeduction', 'incomeTax', 'loanDeduction', 'otherDeduction', 'totalDeductions', 'netSalary', 'employerPension', 'employerCost']
const payrollValues = (data, current = {}) => Object.fromEntries(payrollFields.map((field) => [field, n(data[field], current[field])]))
export async function getPayroll(req, res) {
  try { const where = req.query.payrollMonth ? { payrollMonth: req.query.payrollMonth } : undefined; return res.json(await prisma.payrollRecord.findMany({ where, orderBy: { createdAt: 'desc' } })) }
  catch (error) { return fail(res, error, 'Failed to load payroll records') }
}
export async function getPayrollRecord(req, res) {
  try { const record = await prisma.payrollRecord.findUnique({ where: { id: req.params.id } }); if (!record) return res.status(404).json({ message: 'Payroll record not found' }); return res.json(record) }
  catch (error) { return fail(res, error, 'Failed to load payroll record') }
}
export async function createPayroll(req, res) {
  try {
    const data = req.body || {}, employee = await employeeById(data.employeeId)
    if (!employee || !data.payrollMonth) return res.status(400).json({ message: 'Employee and payroll month are required' })
    if (await prisma.payrollRecord.findFirst({ where: { employeeId: employee.id, payrollMonth: data.payrollMonth } })) return res.status(409).json({ message: 'Payroll record already exists for this employee and month' })
    return res.status(201).json(await prisma.payrollRecord.create({ data: { id: data.id || crypto.randomUUID(), employeeId: employee.id, employeeName: employee.name, department: employee.department, payrollMonth: data.payrollMonth, ...payrollValues(data, { basicSalary: employee.basicSalary }) } }))
  } catch (error) { return fail(res, error, 'Failed to create payroll record') }
}
export async function updatePayroll(req, res) {
  try { const current = await prisma.payrollRecord.findUnique({ where: { id: req.params.id } }); if (!current) return res.status(404).json({ message: 'Payroll record not found' }); return res.json(await prisma.payrollRecord.update({ where: { id: current.id }, data: { payrollMonth: req.body?.payrollMonth ?? current.payrollMonth, ...payrollValues(req.body || {}, current) } })) }
  catch (error) { return fail(res, error, 'Failed to update payroll record') }
}
export async function deletePayroll(req, res) {
  try { const current = await prisma.payrollRecord.findUnique({ where: { id: req.params.id } }); if (!current) return res.status(404).json({ message: 'Payroll record not found' }); await prisma.payrollRecord.delete({ where: { id: current.id } }); return res.json({ message: 'Payroll record deleted successfully' }) }
  catch (error) { return fail(res, error, 'Failed to delete payroll record') }
}
