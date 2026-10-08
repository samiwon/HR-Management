import { authHeaders } from '../../lib/hrApi'

const API_BASE = '/api/employer'

async function ef(path, options = {}) {
  const isForm = options.body instanceof FormData
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: authHeaders(
      options.body && !isForm ? { 'Content-Type': 'application/json' } : {}
    ),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || `Request failed: ${res.status}`)
    err.code = data.code
    err.remainingMinutes = data.remainingMinutes
    throw err
  }
  return data
}

// ── Employees ────────────────────────────────────────────────
export const fetchEmployees = () => ef('/employees')
export const fetchMyEmployeeProfile = () => ef('/profile')
export const updateMyEmployeeProfile = (payload) =>
  ef('/profile', { method: 'PUT', body: JSON.stringify(payload) })
export const uploadMyResume = (file) => {
  const form = new FormData()
  form.append('resume', file)
  return ef('/profile/resume', { method: 'POST', body: form })
}

export const uploadMyStatusDocument = (file) => {
  const form = new FormData()
  form.append('statusDocument', file)
  return ef('/profile/status-document', { method: 'POST', body: form })
}
export async function downloadMyResume() {
  const response = await fetch(`${API_BASE}/profile/resume`, {
    headers: authHeaders(),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to download resume')
  }
  return response.blob()
}

export async function downloadMyStatusDocument() {
  const response = await fetch(`${API_BASE}/profile/status-document`, {
    headers: authHeaders(),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to download the status document')
  }
  return response.blob()
}

export const uploadEmployeeDocument = (file, type, title) => {
  const form = new FormData()
  form.append('resume', file)
  if (type) form.append('type', type)
  if (title) form.append('title', title)
  return ef('/profile/documents', { method: 'POST', body: form })
}

export const deleteEmployeeDocument = (id) => ef(`/profile/documents/${id}`, { method: 'DELETE' })

export async function downloadEmployeeDocument(id) {
  const response = await fetch(`${API_BASE}/profile/documents/${id}`, {
    headers: authHeaders(),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to download document')
  }
  return response.blob()
}

export const createEmployee = (payload) =>
  ef('/employees', { method: 'POST', body: JSON.stringify(payload) })
export const updateEmployee = (id, payload) =>
  ef(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
export const deleteEmployee = (id) =>
  ef(`/employees/${id}`, { method: 'DELETE' })
export const resetEmployeePassword = (id) =>
  ef(`/employees/${id}/reset-password`, { method: 'POST' })

// ── Attendance ───────────────────────────────────────────────
// Optional { month, year } limits the rows to that calendar month so
// the payroll / payslip previews match the period actually selected.
export const fetchAttendance = ({ month, year } = {}) => {
  const params = new URLSearchParams()
  if (month && year) {
    const padded = String(month).padStart(2, '0')
    const lastDay = new Date(year, month, 0).getDate()
    params.set('startDate', `${year}-${padded}-01`)
    params.set('endDate', `${year}-${padded}-${String(lastDay).padStart(2, '0')}`)
  }
  const qs = params.toString()
  return ef(`/attendance${qs ? `?${qs}` : ''}`)
}

// ── Payroll run history (real PayrollRecord rows) ────────────
export const fetchPayrollRecords = () => ef('/payroll').then((d) => d?.records || [])

// ── Leave requests ───────────────────────────────────────────
export const fetchLeaveRequests = () => ef('/leave')
export const createLeaveRequest = (payload) =>
  ef('/leave', { method: 'POST', body: JSON.stringify(payload) })
