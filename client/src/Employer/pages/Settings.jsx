import { useState, useMemo } from 'react'
import {
  Building2,
  Calculator,
  ListChecks,
  Save,
  RotateCcw,
  Plus,
  X,
  Settings as SettingsIcon,
} from 'lucide-react'
import { getDefaultSettings } from '../data/settingsData'

const STORAGE_KEY = 'yanol-settings'

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved) return { ...getDefaultSettings(), ...saved }
  } catch {
    // ignore corrupted storage
  }
  return getDefaultSettings()
}

const NUMBER_LISTS = [
  { key: 'departments', label: 'Departments' },
  { key: 'employmentTypes', label: 'Employment Types' },
  { key: 'employmentStatuses', label: 'Employment Statuses' },
  { key: 'leaveTypes', label: 'Leave Types' },
  { key: 'attendanceStatuses', label: 'Attendance Statuses' },
  { key: 'approvalStatuses', label: 'Approval Statuses' },
  { key: 'genders', label: 'Genders' },
]

function Label({ children }) {
  return <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">{children}</label>
}

function TextInput({ value, onChange }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-[#33383f] rounded-lg bg-white dark:bg-[#15181d] dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-400 transition-colors"
    />
  )
}

function NumberInput({ value, onChange }) {
  return (
    <input
      type="number"
      step="any"
      value={value}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-[#33383f] rounded-lg bg-white dark:bg-[#15181d] dark:text-gray-200 tabular-nums focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-400 transition-colors"
    />
  )
}

function SettingsPage() {
  const [config, setConfig] = useState(loadSettings)
  const [toast, setToast] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const setCompany = (field, value) =>
    setConfig((prev) => ({ ...prev, company: { ...prev.company, [field]: value } }))

  const setPension = (field, value) =>
    setConfig((prev) => ({ ...prev, pension: { ...prev.pension, [field]: value } }))

  const setLeave = (field, value) =>
    setConfig((prev) => ({ ...prev, leave: { ...prev.leave, [field]: value } }))

  const setBracket = (index, field, value) =>
    setConfig((prev) => {
      const brackets = prev.taxBrackets.map((b, i) => (i === index ? { ...b, [field]: value } : b))
      return { ...prev, taxBrackets: brackets }
    })

  const addBracket = () =>
    setConfig((prev) => {
      const last = prev.taxBrackets[prev.taxBrackets.length - 1]
      return {
        ...prev,
        taxBrackets: [...prev.taxBrackets, { min: (last?.max || 0) + 1, max: (last?.max || 0) + 20000, rate: 0, deduction: 0 }],
      }
    })

  const removeBracket = (index) =>
    setConfig((prev) => ({ ...prev, taxBrackets: prev.taxBrackets.filter((_, i) => i !== index) }))

  const addListItem = (key, value) =>
    setConfig((prev) => ({
      ...prev,
      [key]: prev[key].some((x) => x.toLowerCase() === value.trim().toLowerCase()) ? prev[key] : [...prev[key], value.trim()],
    }))

  const removeListItem = (key, item) =>
    setConfig((prev) => ({ ...prev, [key]: prev[key].filter((x) => x !== item) }))

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    showToast('Settings saved — this is the source for Payroll, Leave & Attendance')
  }

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY)
    setConfig(getDefaultSettings())
    showToast('Settings reset to defaults')
  }

  const compInputs = [
    ['name', 'Company Name'],
    ['shortName', 'Short Name'],
    ['address', 'Address'],
    ['phone', 'Phone'],
    ['email', 'Email'],
    ['tin', 'TIN'],
  ]

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-gray-950 text-white dark:bg-[#3a4149] dark:hover:bg-gray-600 px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium animate-in fade-in duration-200">
          {toast}
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-950 text-white dark:bg-[#3a4149] dark:hover:bg-gray-600 flex items-center justify-center shadow-xs">
          <SettingsIcon size={18} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-100">Settings / Admin</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Single source of truth — company info, dropdowns, tax brackets, pension, OT & standard hours
          </p>
        </div>
      </div>

      {/* Company info */}
      <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={16} className="text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100">Company Information</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {compInputs.map(([field, label]) => (
            <div key={field}>
              <Label>{label}</Label>
              <TextInput value={config.company[field]} onChange={(v) => setCompany(field, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* Payroll parameters */}
      <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calculator size={16} className="text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100">Payroll Parameters</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label>Standard Monthly Hours</Label>
            <NumberInput value={config.standardMonthlyHours} onChange={(v) => setConfig((prev) => ({ ...prev, standardMonthlyHours: v }))} />
          </div>
          <div>
            <Label>Overtime Multiplier</Label>
            <NumberInput value={config.overtimeMultiplier} onChange={(v) => setConfig((prev) => ({ ...prev, overtimeMultiplier: v }))} />
          </div>
          <div>
            <Label>Pension — Employee (%)</Label>
            <NumberInput value={config.pension.employeeRate} onChange={(v) => setPension('employeeRate', v)} />
          </div>
          <div>
            <Label>Pension — Employer (%)</Label>
            <NumberInput value={config.pension.employerRate} onChange={(v) => setPension('employerRate', v)} />
          </div>
          <div>
            <Label>Sick Days / Year</Label>
            <NumberInput value={config.leave.sickDaysPerYear} onChange={(v) => setLeave('sickDaysPerYear', v)} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-[#262b31]">
          <div>
            <Label>Annual Leave Base (days)</Label>
            <NumberInput value={config.leave.baseEntitlement} onChange={(v) => setLeave('baseEntitlement', v)} />
          </div>
          <div>
            <Label>+1 Extra Day per (full years)</Label>
            <NumberInput value={config.leave.extraDayPerFullYears} onChange={(v) => setLeave('extraDayPerFullYears', v)} />
          </div>
          <div className="flex items-end">
            <p className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#1c2026] border border-gray-100 dark:border-[#262b31] rounded-lg px-3 py-2 w-full">
              Tenure rule: {config.leave.baseEntitlement} days base + 1 day per {config.leave.extraDayPerFullYears} full years (prorated under 1 yr).
            </p>
          </div>
        </div>
      </div>

      {/* Tax brackets */}
      <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-[#262b31] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100">Income Tax Brackets (ETB / month)</h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Proclamation No. 1395/2025 — Tax = Gross × rate − deduction</p>
          </div>
          <button onClick={addBracket} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-[#33383f] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1c2026] text-xs font-semibold flex items-center gap-1.5 transition-colors">
            <Plus size={14} /> Add Bracket
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="text-[11px] text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#262b31] bg-gray-50/50 dark:bg-[#1c2026]">
                <th className="px-5 py-3 font-medium">Min</th>
                <th className="px-4 py-3 font-medium">Max</th>
                <th className="px-4 py-3 font-medium">Rate (%)</th>
                <th className="px-4 py-3 font-medium">Deduction (ETB)</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#262b31]">
              {config.taxBrackets.map((b, i) => (
                <tr key={i} className="text-xs">
                  <td className="px-5 py-2.5 w-36"><NumberInput value={b.min} onChange={(v) => setBracket(i, 'min', v)} /></td>
                  <td className="px-4 py-2.5 w-36"><NumberInput value={b.max} onChange={(v) => setBracket(i, 'max', v)} /></td>
                  <td className="px-4 py-2.5 w-28"><NumberInput value={b.rate} onChange={(v) => setBracket(i, 'rate', v)} /></td>
                  <td className="px-4 py-2.5 w-36"><NumberInput value={b.deduction} onChange={(v) => setBracket(i, 'deduction', v)} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => removeBracket(i)}
                      disabled={config.taxBrackets.length <= 1}
                      className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-[#1c2026] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Remove bracket"
                    >
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dropdown lists */}
      <div className="bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs p-6">
        <div className="flex items-center gap-2 mb-4">
          <ListChecks size={16} className="text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100">Dropdown Lists</h3>
          <span className="text-[11px] text-gray-400 dark:text-gray-500 ml-1">Used across Employee, Leave and Attendance forms</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
          {NUMBER_LISTS.map(({ key, label }) => (
            <div key={key}>
              <Label>{label}</Label>
              <div className="flex flex-wrap items-center gap-2">
                {config[key].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-gray-100 dark:bg-[#1c2026] text-gray-800 dark:text-gray-200 text-xs font-medium">
                    {item}
                    <button
                      onClick={() => removeListItem(key, item)}
                      className="p-0.5 rounded hover:text-rose-600 hover:bg-gray-200 dark:hover:bg-[#2a3139] transition-colors"
                      title={`Remove ${item}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <span className="inline-flex items-center gap-1">
                  <input
                    id={`add-${key}`}
                    placeholder="Add…"
                    className="w-28 px-2 py-1 text-xs border border-gray-200 dark:border-[#33383f] rounded-lg bg-white dark:bg-[#15181d] dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900/15"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        addListItem(key, e.target.value)
                        e.target.value = ''
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById(`add-${key}`)
                      if (input && input.value.trim()) {
                        addListItem(key, input.value)
                        input.value = ''
                      }
                    }}
                    className="p-1 rounded-md border border-gray-200 dark:border-[#33383f] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1c2026] transition-colors"
                    title="Add item"
                  >
                    <Plus size={12} />
                  </button>
                </span>
              </div>
            </div>
          ))}
          <div>
            <Label>Job Titles (derived from employee records)</Label>
            <div className="flex flex-wrap gap-2">
              {jobTitles.map((t) => (
                <span key={t} className="pl-2.5 pr-2.5 py-1 rounded-lg bg-gray-50 dark:bg-[#1c2026] border border-gray-200 dark:border-[#33383f] text-gray-700 dark:text-gray-300 text-xs font-medium">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          onClick={reset}
          className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#33383f] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1c2026] text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw size={14} /> Reset to Defaults
        </button>
        <button
          onClick={save}
          className="px-5 py-2.5 rounded-xl bg-gray-950 text-white dark:bg-[#3a4149] dark:hover:bg-gray-600 text-xs font-semibold hover:bg-gray-800 flex items-center gap-1.5 transition-colors"
        >
          <Save size={14} /> Save Settings
        </button>
      </div>

      <p className="text-[11px] text-gray-400 dark:text-gray-500 pb-4">
        Defaults reference the source workbook (src/Employer/data/settingsData.js). Saved changes persist in
        localStorage under "{STORAGE_KEY}".
      </p>
    </div>
  )
}

export default SettingsPage