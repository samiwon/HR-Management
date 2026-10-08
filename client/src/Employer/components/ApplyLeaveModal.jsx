import { useState, useEffect } from 'react'
import { X, CalendarCheck, User, Building, Calendar, Hash, FileText, Paperclip, CheckCircle2, Clock, ShieldCheck } from 'lucide-react'
import { SETTINGS } from '../data/settingsData'
import { networkdays, formatDate } from '../lib/leave'
import LuxuryDatePicker from '../../HR-Manager/components/add-employee-modal/LuxuryDatePicker'

// Per-type guidance so employees know what to submit for each leave category
const REMARK_HINTS = {
  'Annual Leave': 'E.g. Annual vacation with family, planned holiday dates…',
  'Sick Leave': 'Describe medical condition / illness requiring recuperation…',
  'Maternity Leave': 'Expected delivery date, antenatal schedule, hospital details…',
  'Paternity Leave': 'Date of birth of newborn child, delivery details…',
  'Unpaid Leave': 'Personal matters, family emergency, travel abroad…',
  'Study Leave': 'Exam timetable, certification course name, institution schedule…',
}

const EVIDENCE_HINTS = {
  'Annual Leave': 'PDF or image document (optional)',
  'Sick Leave': 'Medical certificate / doctor note recommended',
  'Maternity Leave': 'Hospital certificate or clinic note recommended',
  'Paternity Leave': 'Birth notification document (optional)',
  'Unpaid Leave': 'Supporting document (optional)',
  'Study Leave': 'Exam notice or letter of admission recommended',
}

/**
 * Apply for Leave — Modal form matching the 11-field leave schema:
 * 1. Employee Name
 * 2. Department
 * 3. Leave Type
 * 4. Request Date
 * 5. Start Date
 * 6. End Date
 * 7. No. of Days
 * 8. Approval Status
 * 9. Approved By
 * 10. Approval Date
 * 11. Remarks
 */
function ApplyLeaveModal({ isOpen, onClose, onApply, employee = {} }) {
  const [form, setForm] = useState({
    leaveType: 'Annual Leave',
    startDate: '',
    endDate: '',
    remarks: '',
  })
  const [evidence, setEvidence] = useState(null)
  const [error, setError] = useState('')

  // Reset the form whenever the modal is (re)opened
  useEffect(() => {
    if (isOpen) {
      setForm({ leaveType: 'Annual Leave', startDate: '', endDate: '', remarks: '' })
      setEvidence(null)
      setError('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const days = form.startDate && form.endDate ? networkdays(form.startDate, form.endDate) : 0
  const invalidRange =
    form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)

  const todayStr = new Date().toISOString().slice(0, 10)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.startDate || !form.endDate || invalidRange || days <= 0) {
      setError('Please provide a valid date range (End Date must be on or after Start Date).')
      return
    }

    onApply({
      id: `LVE-${String(Date.now()).slice(-4)}`,
      employeeId: employee.employeeId || 'EMP-001',
      employeeName: employee.name || 'Employee',
      department: employee.department || 'General',
      leaveType: form.leaveType,
      requestDate: todayStr,
      startDate: form.startDate,
      endDate: form.endDate,
      days,
      approvalStatus: 'Pending',
      approvedBy: 'Pending HR Review',
      approvalDate: 'Pending',
      remarks: form.remarks,
      evidence: evidence
        ? { name: evidence.name, size: evidence.size, type: evidence.type }
        : null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#15181d] rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-200/90 dark:border-[#262b31] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#262b31] bg-white dark:bg-[#15181d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-gray-950 flex items-center justify-center shadow-xs">
              <CalendarCheck size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-950 dark:text-gray-100">Apply for Leave</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Submit an official statutory or contractual leave application
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1c2026] rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Row 1: Employee Name, Department, Request Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                1. Employee Name
              </label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  disabled
                  value={employee.name || 'Current User'}
                  className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 dark:border-[#262b31] rounded-xl bg-gray-50 dark:bg-[#1c2026] text-gray-800 dark:text-gray-200 font-semibold cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                2. Department
              </label>
              <div className="relative">
                <Building size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  disabled
                  value={employee.department || 'Management'}
                  className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 dark:border-[#262b31] rounded-xl bg-gray-50 dark:bg-[#1c2026] text-gray-800 dark:text-gray-200 font-semibold cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                3. Request Date
              </label>
              <div className="relative">
                <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  disabled
                  value={formatDate(todayStr)}
                  className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 dark:border-[#262b31] rounded-xl bg-gray-50 dark:bg-[#1c2026] text-gray-800 dark:text-gray-200 font-mono font-semibold cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Leave Type, Start Date, End Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                4. Leave Type <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={form.leaveType}
                onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-[#262b31] rounded-xl bg-white dark:bg-[#1c2026] text-gray-950 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-100 cursor-pointer"
              >
                {(SETTINGS?.leaveTypes || ['Annual Leave', 'Sick Leave', 'Maternity Leave', 'Paternity Leave', 'Unpaid Leave', 'Study Leave']).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                5. Start Date <span className="text-rose-500">*</span>
              </label>
              <LuxuryDatePicker
                value={form.startDate}
                onChange={(val) => setForm({ ...form, startDate: val })}
                placeholder="Select start date"
                minDate={todayStr}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                6. End Date <span className="text-rose-500">*</span>
              </label>
              <LuxuryDatePicker
                value={form.endDate}
                onChange={(val) => setForm({ ...form, endDate: val })}
                placeholder="Select end date"
                minDate={form.startDate || todayStr}
              />
            </div>
          </div>

          {/* Row 3: No. of Days, Approval Status, Approved By & Date Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                7. No. of Days
              </label>
              <div className="relative">
                <Hash size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  disabled
                  value={invalidRange ? 'Invalid range' : `${days} working day${days === 1 ? '' : 's'}`}
                  className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 dark:border-[#262b31] rounded-xl bg-gray-50 dark:bg-[#1c2026] text-gray-950 dark:text-gray-100 font-mono font-bold cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                8. Approval Status
              </label>
              <div className="h-9 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5">
                <Clock size={13} />
                <span>Pending HR Approval</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                9 & 10. Approved By / Date
              </label>
              <div className="h-9 text-gray-500 dark:text-gray-400 text-xs font-medium flex items-center gap-1.5">
                <ShieldCheck size={13} />
                <span className="truncate">Pending review</span>
              </div>
            </div>
          </div>

          {/* Row 4: Remarks & Supporting Evidence */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
              11. Remarks / Reason
            </label>
            <div className="relative">
              <FileText size={14} className="absolute left-3 top-3 text-gray-400" />
              <textarea
                rows={2}
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                placeholder={REMARK_HINTS[form.leaveType] || 'State the reason or details for this leave request…'}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 dark:border-[#262b31] rounded-xl bg-white dark:bg-[#1c2026] text-gray-950 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-100 resize-none"
              />
            </div>

            {/* Evidence attachment button */}
            <div className="mt-2.5 flex items-center gap-2.5 flex-wrap">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-[#262b31] rounded-xl bg-gray-50 dark:bg-[#1c2026] hover:bg-gray-100 dark:hover:bg-[#252a32] transition-colors cursor-pointer shadow-2xs">
                <Paperclip size={13} />
                <span>Upload Supporting Evidence</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) setEvidence(file)
                    e.target.value = ''
                  }}
                />
              </label>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                {EVIDENCE_HINTS[form.leaveType] || 'PDF, image or document (optional)'}
              </span>
            </div>

            {evidence && (
              <div className="mt-2 flex items-center justify-between gap-2 px-3.5 py-2 text-xs rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300">
                <span className="flex items-center gap-2 truncate">
                  <FileText size={13} className="shrink-0" />
                  <span className="truncate font-semibold">{evidence.name}</span>
                  <span className="shrink-0 text-[10px] text-emerald-600 dark:text-emerald-400">
                    ({(evidence.size / 1024).toFixed(0)} KB)
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setEvidence(null)}
                  className="text-gray-400 hover:text-rose-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs font-bold text-rose-600 dark:text-rose-400 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900">
              {error}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-[#262b31]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-[#1c2026] dark:hover:bg-[#252a32] rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-gray-950 hover:bg-black dark:bg-white dark:hover:bg-gray-200 dark:text-gray-950 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 size={13} />
              <span>Submit Leave Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ApplyLeaveModal
