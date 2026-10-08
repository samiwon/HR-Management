import { Router } from 'express'

import {
  getHRSettings,
  updateHRSettings,
  getDepartmentEmployeeCounts,
} from '../controllers/hr-settings.controller.js'

import {
  getHRReports,
} from '../controllers/hr-reports.controller.js'

import {
  getDashboard,

  getEmployees,
  getEmployee,
  downloadEmployeeResume,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  restoreEmployee,
  resetEmployeePassword,

  getAttendance,
  getAttendanceRecord,
  createAttendance,
  updateAttendance,
  deleteAttendance,

  employeeCheckIn,
  employeeCheckOut,
  acceptLateAttendance,

  getLeaveRequests,
  getLeaveRequest,
  createLeaveRequest,
  updateLeaveRequest,
  deleteLeaveRequest,

  getPayroll,
  getPayrollRecord,
  createPayroll,
  updatePayroll,
  deletePayroll,
} from '../controllers/hr-manager.controller.js'

import { requirePermission, requireAnyHrPermission } from '../middleware/rbac.middleware.js'
import hrUsersRoutes from './hr-users.routes.js'

const router = Router()

// ============================================================
// ACCESS CONTROL
// ============================================================
//
// Every route below is now guarded by the permission it actually needs, so the
// API enforces the same rules the dashboard UI reflects. Hiding a Delete
// button is a courtesy; the 403 from `requirePermission('employees.delete')` is
// the wall, and it is what answers a request made by hand with the button
// bypassed.
//
// `requirePermission` also loads the account from the database on every
// request, which is what makes deactivating an HR user take effect immediately
// rather than when their existing token happens to expire.
//
// The matching frontend calls send the bearer token through authHeaders() in
// src/lib/hrApi.js. A call that hand-writes its own headers omits
// Authorization and is answered with "Authentication required" even though the
// admin is signed in.
//
// The employer client reuses createEmployee/updateEmployee/deleteEmployee/
// resetEmployeePassword through /api/employer, deliberately untouched: that is
// the company-owner portal, not HR staff, and giving it HR permissions would
// change behaviour it relies on today.

// ============================================================
// DASHBOARD
// ============================================================
//
// The dashboard aggregates every module and so has no single permission of its
// own; it is readable by any account holding an HR role with at least one
// module permission, and by nobody else.

router.get('/dashboard', ...requireAnyHrPermission(), getDashboard)

// ============================================================
// EMPLOYEES
// ============================================================

router.get('/employees', ...requirePermission('employees.view'), getEmployees)
router.get(
  '/employees/:id/resume',
  ...requirePermission('employees.resume'),
  downloadEmployeeResume,
)
router.get('/employees/:id', ...requirePermission('employees.view'), getEmployee)

// Creating or changing an employee also creates or re-points a login identity,
// so each of these maps to its own permission rather than a shared "manage".
router.post('/employees', ...requirePermission('employees.add'), createEmployee)
router.put('/employees/:id', ...requirePermission('employees.edit'), updateEmployee)
router.delete(
  '/employees/:id',
  ...requirePermission('employees.delete'),
  deleteEmployee,
)
router.post(
  '/employees/:id/restore',
  ...requirePermission('employees.edit'),
  restoreEmployee,
)
router.post(
  '/employees/:id/reset-password',
  ...requirePermission('employees.reset_password'),
  resetEmployeePassword,
)

// ============================================================
// SETTINGS
// ============================================================
//
// Reading settings is not one audience's business alone: the department, job
// title and employment-type lists are building blocks for the employee form,
// and the attendance configuration is read by the attendance and payroll pages.
// So reading is allowed to anyone who can use one of those modules, while
// writing requires settings.edit. The route used to be open to the whole
// internet, so this is a narrowing either way.

router.get(
  '/settings',
  ...requirePermission(
    'settings.view',
    'employees.view',
    'payroll.view',
    'attendance.view',
  ),
  getHRSettings,
)
router.put('/settings', ...requirePermission('settings.edit'), updateHRSettings)
router.get('/departments/usage', ...requireAnyHrPermission(), getDepartmentEmployeeCounts)

// ============================================================
// REPORTS
// ============================================================

router.get('/reports', ...requirePermission('reports.view'), getHRReports)

// ============================================================
// ATTENDANCE
// ============================================================

router.get('/attendance', ...requirePermission('attendance.view'), getAttendance)
router.get(
  '/attendance/:id',
  ...requirePermission('attendance.view'),
  getAttendanceRecord,
)

router.post('/attendance', ...requirePermission('attendance.manage'), createAttendance)
router.put(
  '/attendance/:id',
  ...requirePermission('attendance.manage'),
  updateAttendance,
)
router.delete(
  '/attendance/:id',
  ...requirePermission('attendance.manage'),
  deleteAttendance,
)

// The employee punch lives on /api/employer and is untouched. These two are the
// HR-side equivalents and are unused by the dashboard, so they follow the
// manage permission like the rest of the module.
router.post(
  '/attendance/check-in',
  ...requirePermission('attendance.manage'),
  employeeCheckIn,
)

router.post(
  '/attendance/check-out',
  ...requirePermission('attendance.manage'),
  employeeCheckOut,
)

router.put(
  '/attendance/:id/accept-late',
  ...requirePermission('attendance.manage'),
  acceptLateAttendance,
)

// ============================================================
// LEAVE REQUESTS
// ============================================================

router.get('/leave', ...requirePermission('leave.view'), getLeaveRequests)
router.get('/leave/:id', ...requirePermission('leave.view'), getLeaveRequest)

router.post('/leave', ...requirePermission('leave.create'), createLeaveRequest)

// Deciding is separate from seeing: a role can be trusted to read every request
// without being trusted to approve its own.
router.put('/leave/:id', ...requirePermission('leave.decide'), updateLeaveRequest)

router.delete('/leave/:id', ...requirePermission('leave.delete'), deleteLeaveRequest)

// ============================================================
// PAYROLL
// ============================================================

router.get('/payroll', ...requirePermission('payroll.view'), getPayroll)
router.get('/payroll/:id', ...requirePermission('payroll.view'), getPayrollRecord)

router.post('/payroll', ...requirePermission('payroll.create'), createPayroll)

router.put('/payroll/:id', ...requirePermission('payroll.edit'), updatePayroll)

router.delete('/payroll/:id', ...requirePermission('payroll.delete'), deletePayroll)

// ============================================================
// USER & ROLE MANAGEMENT
// ============================================================
//
// Mounted here so the paths stay under /api/hr-manager. Each of its own routes
// names the administration permission it needs.

router.use(hrUsersRoutes)

export default router
