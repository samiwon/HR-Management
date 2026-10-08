import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { handleResumeUpload } from '../middleware/resume-upload.js'
import { handleStatusDocumentUpload } from '../middleware/status-document-upload.js'

import {
  getDashboard,
  getEmployees,
  getMyProfile,
  updateMyProfile,
  uploadMyResume,
  downloadMyResume,
  uploadMyStatusDocument,
  downloadMyStatusDocument,
  uploadEmployeeDocument,
  downloadEmployeeDocument,
  deleteEmployeeDocument,
  getAttendance,
  getAttendanceConfig,
  getAttendanceStatus,
  checkIn,
  checkOut,
  emergencyCheckOut,
  getLeaveRequests,
  createLeaveRequest,
  getPayroll,
} from '../controllers/employer.controller.js'

import {
  createEmployee,
  updateEmployee,
  deleteEmployee,
  resetEmployeePassword,
} from '../controllers/hr-manager.controller.js'

const router = Router()

// Every employee-dashboard request requires a valid JWT.
router.use(requireAuth)

// Dashboard
router.get('/dashboard', getDashboard)

// Employee information used by the existing employee dashboard
router.get('/employees', getEmployees)
router.get('/profile', getMyProfile)
router.put('/profile', updateMyProfile)
router.post('/profile/resume', handleResumeUpload, uploadMyResume)
router.get('/profile/resume', downloadMyResume)

// The document backing the employee's current status. Uploading replaces the
// previous one.
router.post('/profile/status-document', handleStatusDocumentUpload, uploadMyStatusDocument)
router.get('/profile/status-document', downloadMyStatusDocument)
router.post('/employees', createEmployee)
router.put('/employees/:id', updateEmployee)
router.delete('/employees/:id', deleteEmployee)
router.post('/employees/:id/reset-password', resetEmployeePassword)

// Documents
router.post('/profile/documents', handleResumeUpload, uploadEmployeeDocument)
router.get('/profile/documents/:documentId', downloadEmployeeDocument)
router.delete('/profile/documents/:documentId', deleteEmployeeDocument)

// Attendance
router.get('/attendance', getAttendance)
router.get('/attendance/config', getAttendanceConfig)
// Today's punch state together with the HR-configured windows, so the
// employee portal never re-derives the attendance date or the schedule.
router.get('/attendance/status', getAttendanceStatus)
router.post('/attendance/check-in', checkIn)
router.post('/attendance/check-out', checkOut)
router.post('/attendance/emergency-check-out', emergencyCheckOut)

// Leave
router.get('/leave', getLeaveRequests)
router.post('/leave', createLeaveRequest)

// Payroll
router.get('/payroll', getPayroll)

export default router