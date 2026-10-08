import { useState, useEffect, useMemo } from 'react'
import { resolveEmployee, getCurrentUser } from '../lib/currentUser'
import { fetchEmployees } from '../lib/employerApi'
import { formatETB } from '../lib/payroll'

function Salary() {
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

  const basicSalary = Number(employee?.basicSalary || 0)
  const transport = Number(employee?.transportAllowance || 0)
  const housing = Number(employee?.housingAllowance || 0)
  const meal = Number(employee?.mealAllowance || 0)
  const other = Number(employee?.otherAllowance || 0)

  const salaryBreakdown = useMemo(() => [
    { label: 'Basic Salary', amount: basicSalary, type: 'base' },
    { label: 'Housing Allowance', amount: housing, type: 'allowance' },
    { label: 'Transport Allowance', amount: transport, type: 'allowance' },
    { label: 'Meal Allowance', amount: meal, type: 'allowance' },
    { label: 'Other Allowance', amount: other, type: 'allowance' },
  ].filter((item) => item.amount > 0), [basicSalary, housing, transport, meal, other])

  const total = salaryBreakdown.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-gray-100">Salary & Compensation</h2>
        <p className="text-slate-500 dark:text-gray-400 mt-1">Official compensation breakdown for {employee?.name || 'Employee'}</p>
      </div>

      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-6 text-white shadow-lg">
        <p className="text-sm text-indigo-200">Gross Monthly Base & Allowances</p>
        <p className="text-4xl font-bold mt-1">
          {formatETB(total)}
        </p>
        <p className="text-sm text-indigo-200 mt-3">Disbursed via {employee?.bankName || 'Direct Deposit'}</p>
      </div>

      <div className="bg-white dark:bg-[#15181d] rounded-xl shadow-sm border border-slate-200 dark:border-[#262b31] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#262b31]">
          <h3 className="font-semibold text-slate-900 dark:text-gray-100">Earnings Components</h3>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-[#262b31]">
          {salaryBreakdown.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">No salary records configured for this profile.</div>
          ) : (
            salaryBreakdown.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      item.type === 'base'
                        ? 'bg-indigo-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <p className="text-sm font-medium text-slate-800 dark:text-gray-200">{item.label}</p>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-gray-100">
                  {formatETB(item.amount)}
                </p>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-[#1c2026] border-t border-slate-100 dark:border-[#262b31]">
          <p className="text-sm font-semibold text-slate-900 dark:text-gray-100">Total Fixed Compensation</p>
          <p className="text-sm font-bold text-indigo-600">{formatETB(total)}</p>
        </div>
      </div>
    </div>
  )
}

export default Salary