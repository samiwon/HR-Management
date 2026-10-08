import { useState, useEffect, useMemo } from 'react'
import { resolveEmployee, getCurrentUser } from '../lib/currentUser'
import { fetchEmployees } from '../lib/employerApi'

function Profile() {
  const user = getCurrentUser()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEmployees()
      .then((emps) => setEmployees(Array.isArray(emps) ? emps : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const employee = useMemo(() => resolveEmployee(employees, user), [employees, user])

  const initials = (employee?.name || user?.name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

  const profileInfo = [
    { label: 'Full Name', value: employee?.name || user?.name || '—' },
    { label: 'Employee ID', value: employee?.employeeId || user?.employeeId || '—' },
    { label: 'Department', value: employee?.department || '—' },
    { label: 'Job Title / Role', value: employee?.jobTitle || '—' },
    { label: 'Email', value: employee?.email || user?.email || '—' },
    { label: 'Phone', value: employee?.phone || '—' },
    { label: 'Employment Status', value: employee?.employmentStatus || 'Active' },
    { label: 'Date Joined', value: employee?.joinDate ? new Date(employee.joinDate).toLocaleDateString() : '—' },
  ]

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-gray-100">Profile</h2>
        <p className="text-slate-500 dark:text-gray-400 mt-1">Your personal and employment information</p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex items-center gap-6 dark:bg-[#15181d] dark:border-[#262b31]">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
          {initials}
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-gray-100">{employee?.name || user?.name || 'Current User'}</h3>
          <p className="text-indigo-600 text-sm font-medium mt-1">{employee?.jobTitle || 'Staff Member'}</p>
          <span className="inline-block mt-2 text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
            {employee?.employmentStatus || 'Active'}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden dark:bg-[#15181d] dark:border-[#262b31]">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#262b31]">
          <h3 className="font-semibold text-slate-900 dark:text-gray-100">Personal Details</h3>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-[#262b31]">
          {profileInfo.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between px-6 py-4"
            >
              <p className="text-sm text-slate-500 dark:text-gray-400">{item.label}</p>
              <p className="text-sm font-medium text-slate-900 dark:text-gray-100">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Profile