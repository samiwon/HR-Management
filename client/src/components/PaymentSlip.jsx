import React from 'react'

export function formatSlipAmount(val) {
  const num = Number(val || 0)
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function PaymentSlip({
  employee = {},
  payrollPeriod = 'August 2026',
  earnings: customEarnings,
  deductions: customDeductions,
  month,
  year,
}) {
  const period =
    payrollPeriod ||
    (month && year
      ? `${new Date(year, month - 1).toLocaleString('en-US', { month: 'long' })} ${year}`
      : 'August 2026')

  // Figures
  const basicSalary = customEarnings?.basicSalary ?? employee.basicSalary ?? 0
  const transport = customEarnings?.transport ?? employee.transportAllowance ?? employee.transport ?? 0
  const housing = customEarnings?.housing ?? employee.housingAllowance ?? employee.housing ?? 0
  const mealOther =
    customEarnings?.mealOther ??
    ((employee.mealAllowance || 0) + (employee.otherAllowance || 0))
  const otPay = customEarnings?.otPay ?? employee.otPay ?? 0
  const grossSalary =
    customEarnings?.grossSalary ??
    employee.gross ??
    employee.grossSalary ??
    (basicSalary + transport + housing + mealOther + otPay)

  const incomeTax = customDeductions?.incomeTax ?? employee.incomeTax ?? 0
  const pension = customDeductions?.pension ?? employee.pensionEmployee ?? employee.pension ?? 0
  const otherDeduct = customDeductions?.otherDeduct ?? employee.otherDeductions ?? 0
  const loanDeduct = customDeductions?.loanDeduct ?? employee.loanDeductions ?? 0
  const totalDeduct =
    customDeductions?.totalDeduct ??
    (incomeTax + pension + otherDeduct + loanDeduct)
  const netSalary =
    customDeductions?.netSalary ??
    employee.netSalary ??
    (grossSalary - totalDeduct)

  const rows = [
    { earnLabel: 'Basic Salary', earnVal: basicSalary, dedLabel: 'Income Tax', dedVal: incomeTax },
    { earnLabel: 'Transport', earnVal: transport, dedLabel: 'Pension', dedVal: pension },
    { earnLabel: 'Housing', earnVal: housing, dedLabel: 'Other Deduct.', dedVal: otherDeduct },
    { earnLabel: 'Meal/Other', earnVal: mealOther, dedLabel: 'Loan Deduct.', dedVal: loanDeduct },
    { earnLabel: 'Overtime Pay', earnVal: otPay, dedLabel: 'Total Deduct.', dedVal: totalDeduct, isDedTotal: true },
  ]

  // Signature script generation
  const employeeName = employee?.name || 'Employee'
  const empInitial = employeeName.split(' ')[0] || 'Emp'

  return (
    <div className="bg-white dark:bg-[#111418] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-[#33383f] rounded-lg p-5 shadow-xs text-[11px] font-sans print:border-gray-400 print:text-black print:p-4 print:shadow-none print:break-inside-avoid w-full max-w-[540px] mx-auto">
      {/* Company Header */}
      <div className="text-center pb-2.5 mb-2.5 border-b border-gray-200 dark:border-[#262b31]">
        <h2 className="text-sm font-extrabold tracking-wider uppercase text-gray-950 dark:text-white">
          YANOLTECH SOLUTIONS PLC
        </h2>
        <p className="text-[10px] text-gray-600 dark:text-gray-400">
          Bole sub,w07,A.A, Ethiopia | 0942497990
        </p>
        <div className="inline-block mt-1 font-black text-xs uppercase tracking-widest text-gray-900 dark:text-gray-100 border-y border-gray-900 dark:border-gray-200 px-3 py-0.5">
          PAYMENT SLIP
        </div>
      </div>

      {/* Metadata Table */}
      <div className="grid grid-cols-[110px_1fr] gap-x-2 gap-y-1 mb-3 text-[11px] border-b border-gray-200 dark:border-[#262b31] pb-2.5">
        <span className="font-semibold text-gray-600 dark:text-gray-400">Payroll Period:</span>
        <span className="font-bold text-gray-900 dark:text-gray-100">{period}</span>

        <span className="font-semibold text-gray-600 dark:text-gray-400">Employee ID:</span>
        <span className="font-mono font-bold text-gray-900 dark:text-gray-100">{employee.employeeId || 'EMP-0001'}</span>

        <span className="font-semibold text-gray-600 dark:text-gray-400">Employee Name:</span>
        <span className="font-bold text-gray-950 dark:text-gray-100">{employeeName}</span>

        <span className="font-semibold text-gray-600 dark:text-gray-400">Department:</span>
        <span className="font-medium text-gray-800 dark:text-gray-200">{employee.department || 'Product Development'}</span>

        <span className="font-semibold text-gray-600 dark:text-gray-400">Job Title:</span>
        <span className="font-medium text-gray-800 dark:text-gray-200">{employee.jobTitle || 'Full Stack Development'}</span>

        <span className="font-semibold text-gray-600 dark:text-gray-400">TIN:</span>
        <span className="font-mono text-gray-700 dark:text-gray-300">{employee.tin || '—'}</span>

        <span className="font-semibold text-gray-600 dark:text-gray-400">Bank Account:</span>
        <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{employee.bankAccount || '1000447514471'}</span>
      </div>

      {/* Earnings & Deductions Grid Table */}
      <div className="border border-gray-300 dark:border-[#33383f] rounded overflow-hidden mb-3">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-[#1a1f26] border-b border-gray-300 dark:border-[#33383f] font-bold text-gray-900 dark:text-gray-100">
              <th className="py-1 px-2 text-left w-[30%]">Earnings</th>
              <th className="py-1 px-2 text-right w-[20%] border-r border-gray-300 dark:border-[#33383f]">Amount</th>
              <th className="py-1 px-2 text-left w-[30%]">Deductions</th>
              <th className="py-1 px-2 text-right w-[20%]">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-[#262b31]">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-[#15191f]">
                <td className="py-1 px-2 text-gray-700 dark:text-gray-300">{r.earnLabel}</td>
                <td className="py-1 px-2 text-right font-mono tabular-nums text-gray-900 dark:text-gray-100 border-r border-gray-300 dark:border-[#33383f]">
                  {formatSlipAmount(r.earnVal)}
                </td>
                <td className={`py-1 px-2 ${r.isDedTotal ? 'font-bold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                  {r.dedLabel}
                </td>
                <td className={`py-1 px-2 text-right font-mono tabular-nums ${r.isDedTotal ? 'font-bold text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-gray-100'}`}>
                  {formatSlipAmount(r.dedVal)}
                </td>
              </tr>
            ))}
            {/* Totals Summary Row */}
            <tr className="bg-gray-50 dark:bg-[#161a20] font-black border-t-2 border-gray-900 dark:border-gray-200">
              <td className="py-1.5 px-2 uppercase text-gray-950 dark:text-white">Gross Salary</td>
              <td className="py-1.5 px-2 text-right font-mono text-gray-950 dark:text-white border-r border-gray-300 dark:border-[#33383f]">
                {formatSlipAmount(grossSalary)}
              </td>
              <td className="py-1.5 px-2 uppercase text-emerald-700 dark:text-emerald-400">NET SALARY</td>
              <td className="py-1.5 px-2 text-right font-mono text-emerald-700 dark:text-emerald-400">
                {formatSlipAmount(netSalary)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signatures with realistic signed credentials and stamp */}
      <div className="pt-2 border-t border-gray-200 dark:border-[#262b31] space-y-3">
        <div className="grid grid-cols-2 gap-4">
          {/* Prepared by */}
          <div className="bg-gray-50/70 dark:bg-[#161a20] p-2 rounded border border-gray-200/80 dark:border-[#2b3038] relative">
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block uppercase">Prepared by:</span>
            <div className="h-7 flex items-center justify-start pl-2">
              <span className="font-serif italic font-bold text-xs text-indigo-700 dark:text-indigo-400 tracking-wide rotate-[-3deg] select-none">
                Finance & Payroll
              </span>
            </div>
            <div className="text-[9px] text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-[#262b31] pt-0.5">
              Finance Officer · Signed
            </div>
          </div>

          {/* Approved by */}
          <div className="bg-gray-50/70 dark:bg-[#161a20] p-2 rounded border border-gray-200/80 dark:border-[#2b3038] relative">
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block uppercase">Approved by:</span>
            <div className="h-7 flex items-center justify-start pl-2">
              <span className="font-serif italic font-bold text-xs text-emerald-700 dark:text-emerald-400 tracking-wide rotate-[2deg] select-none">
                HR Administration
              </span>
            </div>
            <div className="text-[9px] text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-[#262b31] pt-0.5">
              HR Manager · Signed
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Employee Sign */}
          <div className="bg-gray-50/70 dark:bg-[#161a20] p-2 rounded border border-gray-200/80 dark:border-[#2b3038]">
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block uppercase">Employee Sign.:</span>
            <div className="h-7 flex items-center justify-start pl-2">
              <span className="font-serif italic text-xs text-gray-700 dark:text-gray-300 rotate-[-1deg] select-none">
                {employee?.name || 'Employee Signature'}
              </span>
            </div>
            <div className="text-[9px] text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-[#262b31] pt-0.5">
              Acknowledged Receipt
            </div>
          </div>

          {/* Authorized Sign & Company Stamp */}
          <div className="bg-gray-50/70 dark:bg-[#161a20] p-2 rounded border border-gray-200/80 dark:border-[#2b3038] relative overflow-hidden">
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block uppercase">Authorized Sign.:</span>
            <div className="h-7 flex items-center justify-between pl-2">
              <span className="font-serif italic font-extrabold text-xs text-blue-800 dark:text-blue-400 rotate-[-2deg] select-none">
                Yanoltech Mgt.
              </span>
              {/* Circular official stamp badge */}
              <div className="border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter rotate-[-8deg] select-none opacity-85">
                VERIFIED SEAL
              </div>
            </div>
            <div className="text-[9px] text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-[#262b31] pt-0.5">
              Official Corporate Stamp
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
