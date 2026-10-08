import { useState } from 'react'
import {
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building,
  DollarSign,
  Trash2,
  Pencil,
  IdCard,
  Briefcase,
  CreditCard,
  User,
  FileText,
  Award,
  Shield,
  Clock,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Heart,
  Hash,
  Building2,
  BadgeCheck,
  Banknote,
  Receipt,
  ScrollText,
  Contact,
  Home,
  Users,
  KeyRound,
} from 'lucide-react'

function getDefaultEmployee() {
  return {
    id: '',
    employeeId: '',
    name: 'Employee',
    email: '',
    phone: '',
    location: '',
    gender: '',
    dateOfBirth: '',
    joinDate: '',
    exitDate: '',
    employmentType: 'Permanent',
    department: '',
    jobTitle: '',
    manager: '',
    roleType: '',
    basicSalary: 0,
    transportAllowance: 0,
    housingAllowance: 0,
    mealAllowance: 0,
    otherAllowance: 0,
    otherDeductions: 0,
    loanDeductions: 0,
    status: 'Active',
    employmentStatus: 'Active',
    avatar: '',
    address: '',
    emergencyContact: '',
    tin: '',
    pensionId: '',
    identityType: '',
    identityNumber: '',
    identityIssueDate: '',
    identityExpiryDate: '',
    identityFrontUrl: '',
    identityFrontName: '',
    identityBackUrl: '',
    identityBackName: '',
    cvUrl: '',
    cvName: '',
    bankName: '',
    bankAccount: '',
    notes: '',
    certifications: [],
  }
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'employment', label: 'Employment', icon: Briefcase },
  { id: 'personal', label: 'Personal', icon: Contact },
  { id: 'compensation', label: 'Compensation', icon: DollarSign },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'banking', label: 'Banking', icon: CreditCard },
  { id: 'certifications', label: 'Certificates', icon: Award },
  { id: 'actions', label: 'Actions', icon: Shield },
]

function formatFileSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function DetailRow({ icon: Icon, label, value, mono, alert }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 dark:bg-[#1c2026] dark:border-[#262b31]">
      <div className={`p-2 rounded-lg shrink-0 ${alert ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400' : 'bg-gray-100 text-gray-500 dark:bg-[#262b31] dark:text-gray-400'}`}>
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500 tracking-wider">{label}</p>
        <p className={`text-xs font-medium mt-0.5 ${mono ? 'font-mono' : ''} ${alert ? 'text-rose-600 dark:text-rose-400' : 'text-gray-800 dark:text-gray-200'}`}>
          {value || '—'}
        </p>
      </div>
    </div>
  )
}

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={14} className="text-gray-400 dark:text-gray-500" />
      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</h4>
    </div>
  )
}

function TabPanel({ employee, activeTab, status, setStatus, onResetPassword, resetPassword, resetting }) {
  const e = employee

  if (activeTab === 'overview') {
    return (
      <div className="space-y-4">
        <SectionHeader icon={User} title="Contact Information" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DetailRow icon={Mail} label="Email" value={e.email} />
          <DetailRow icon={Phone} label="Phone" value={e.phone} />
          <DetailRow icon={MapPin} label="Location" value={e.location} />
          <DetailRow icon={Home} label="Address" value={e.address} />
          <DetailRow icon={Contact} label="Emergency Contact" value={e.emergencyContact} />
          <DetailRow icon={Users} label="Manager" value={e.manager} />
        </div>

        <div className="mt-4 p-4 rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20">
          <SectionHeader icon={KeyRound} title="Employee Login Password" />
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-3">
            Reset the employee login if the temporary password was lost. The employee must change it after signing in.
          </p>
          <button
            type="button"
            disabled={resetting || !onResetPassword}
            onClick={onResetPassword}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <KeyRound size={13} />
            {resetting ? 'Resetting...' : 'Reset Temporary Password'}
          </button>
          {resetPasswordNotice && (
            <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-white dark:border-amber-900/40 dark:bg-[#1c2026]">
              <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">Temporary password issued</p>
              <p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-400">{resetPasswordNotice}</p>
            </div>
          )}
        </div>

        <div className="mt-4">
          <SectionHeader icon={ScrollText} title="Notes" />
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 dark:bg-[#1c2026] dark:border-[#262b31]">
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {e.notes || 'No notes added yet.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (activeTab === 'employment') {
    const exitInfo = e.exitDate ? daysUntil(e.exitDate) : null
    return (
      <div className="space-y-4">
        <SectionHeader icon={Briefcase} title="Job Details" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DetailRow icon={Briefcase} label="Job Title" value={e.jobTitle} />
          <DetailRow icon={Building} label="Department" value={e.department} />
          <DetailRow icon={Hash} label="Employee ID" value={e.employeeId} mono />
          <DetailRow icon={User} label="Role Type" value={e.roleType} />
          <DetailRow icon={Building2} label="Employment Type" value={e.employmentType} />
          <DetailRow icon={Users} label="Manager" value={e.manager} />
        </div>

        <div className="mt-4">
          <SectionHeader icon={Calendar} title="Employment Timeline" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-gray-100 dark:border-[#262b31] bg-gray-50 dark:bg-[#1c2026]">
              <p className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500 tracking-wider">Join Date</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-1">{formatDate(e.joinDate)}</p>
            </div>
            <div className={`p-3 rounded-xl border ${e.exitDate ? 'border-rose-200 bg-rose-50 dark:border-rose-900/30 dark:bg-rose-950/10' : 'border-gray-100 bg-gray-50 dark:border-[#262b31] dark:bg-[#1c2026]'}`}>
              <p className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500 tracking-wider">End / Exit Date</p>
              {e.exitDate ? (
                <div>
                  <p className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-1">{formatDate(e.exitDate)}</p>
                  {exitInfo !== null && (
                    <p className={`text-[10px] mt-1 font-medium ${exitInfo > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {exitInfo > 0 ? `${exitInfo} days remaining` : exitInfo === 0 ? 'Termination date is TODAY' : `Terminated ${Math.abs(exitInfo)} days ago`}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm font-bold text-gray-600 dark:text-gray-400 mt-1">No end date set</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <SectionHeader icon={Award} title="Employment Status" />
          <div className="p-3 rounded-xl border border-gray-100 dark:border-[#262b31] bg-gray-50 dark:bg-[#1c2026]">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                status === 'Active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                status === 'Onboarding' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' :
                'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
              }`}>
                {status}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {status === 'Active' && 'Currently employed'}
                {status === 'Onboarding' && 'Onboarding in progress'}
                {status === 'Inactive' && 'No longer active'}
              </span>
            </div>
            {e.exitDate && status === 'Active' && (
              <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30 flex items-center gap-2">
                <AlertTriangle size={12} className="text-amber-600 dark:text-amber-400" />
                <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
                  This employee has an exit date but is still marked Active.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (activeTab === 'personal') {
    return (
      <div className="space-y-4">
        <SectionHeader icon={User} title="Personal Information" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DetailRow icon={User} label="Full Name" value={e.name} />
          <DetailRow icon={User} label="Gender" value={e.gender} />
          <DetailRow icon={Calendar} label="Date of Birth" value={formatDate(e.dateOfBirth)} />
          <DetailRow icon={Phone} label="Phone" value={e.phone} />
          <DetailRow icon={Mail} label="Email" value={e.email} />
          <DetailRow icon={MapPin} label="Location" value={e.location} />
          <DetailRow icon={Home} label="Address" value={e.address} />
          <DetailRow icon={Contact} label="Emergency Contact" value={e.emergencyContact} />
        </div>
      </div>
    )
  }

  if (activeTab === 'compensation') {
    const totalAllowances = (e.transportAllowance || 0) + (e.housingAllowance || 0) + (e.mealAllowance || 0) + (e.otherAllowance || 0)
    const totalDeductions = (e.otherDeductions || 0) + (e.loanDeductions || 0)
    const netSalary = (e.basicSalary || 0) + totalAllowances - totalDeductions

    return (
      <div className="space-y-4">
        <SectionHeader icon={DollarSign} title="Salary & Allowances" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DetailRow icon={Banknote} label="Basic Salary" value={`$${Number(e.basicSalary || 0).toLocaleString('en-US')}`} mono />
          <DetailRow icon={Receipt} label="Transport Allowance" value={e.transportAllowance ? `$${Number(e.transportAllowance).toLocaleString('en-US')}` : '$0'} mono />
          <DetailRow icon={Receipt} label="Housing Allowance" value={e.housingAllowance ? `$${Number(e.housingAllowance).toLocaleString('en-US')}` : '$0'} mono />
          <DetailRow icon={Receipt} label="Meal Allowance" value={e.mealAllowance ? `$${Number(e.mealAllowance).toLocaleString('en-US')}` : '$0'} mono />
          <DetailRow icon={Receipt} label="Other Allowances" value={e.otherAllowance ? `$${Number(e.otherAllowance).toLocaleString('en-US')}` : '$0'} mono />
        </div>

        <div className="mt-4">
          <SectionHeader icon={DollarSign} title="Deductions" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DetailRow icon={Receipt} label="Other Deductions" value={e.otherDeductions ? `$${Number(e.otherDeductions).toLocaleString('en-US')}` : '$0'} mono />
            <DetailRow icon={Receipt} label="Loan Deductions" value={e.loanDeductions ? `$${Number(e.loanDeductions).toLocaleString('en-US')}` : '$0'} mono />
          </div>
        </div>

        <div className="mt-4">
          <SectionHeader icon={DollarSign} title="Summary" />
          <div className="p-4 rounded-xl border border-gray-100 dark:border-[#262b31] bg-gray-50 dark:bg-[#1c2026] space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Basic Salary</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">${Number(e.basicSalary || 0).toLocaleString('en-US')}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">+ Total Allowances</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">${totalAllowances.toLocaleString('en-US')}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">− Total Deductions</span>
              <span className="font-medium text-rose-600 dark:text-rose-400">${totalDeductions.toLocaleString('en-US')}</span>
            </div>
            <div className="border-t border-gray-200 dark:border-[#33383f] pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Net Monthly</span>
                <span className="text-sm font-bold text-gray-950 dark:text-gray-100">${netSalary.toLocaleString('en-US')}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-400">Annual Estimate</span>
                <span className="text-[10px] font-semibold text-gray-500">${(netSalary * 12).toLocaleString('en-US')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (activeTab === 'documents') {
    const hasIdentity = Boolean(e.identityNumber || e.identityType)
    const hasCv = Boolean(e.cvUrl)
    return (
      <div className="space-y-4">
        <SectionHeader icon={IdCard} title="Identity Document (KYC)" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DetailRow icon={IdCard} label="Identity Type" value={e.identityType || 'Not provided'} />
          <DetailRow icon={Hash} label="Identity Number" value={e.identityNumber || 'Not provided'} mono />
          <DetailRow icon={Calendar} label="Issue Date" value={formatDate(e.identityIssueDate)} />
          <DetailRow icon={Calendar} label="Expiry Date" value={formatDate(e.identityExpiryDate)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div className="p-3 rounded-xl border border-gray-100 dark:border-[#262b31] bg-gray-50 dark:bg-[#1c2026]">
            <p className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500 tracking-wider">Front Scan</p>
            {e.identityFrontUrl ? (
              <div className="mt-2">
                <img src={e.identityFrontUrl} alt="ID Front" className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-[#33383f]" />
                <p className="text-[10px] text-gray-500 mt-1 truncate">{e.identityFrontName || 'id-front'}</p>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2 text-gray-400">
                <FileText size={14} />
                <span className="text-[10px]">No file uploaded</span>
              </div>
            )}
          </div>
          <div className="p-3 rounded-xl border border-gray-100 dark:border-[#262b31] bg-gray-50 dark:bg-[#1c2026]">
            <p className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500 tracking-wider">Back Scan</p>
            {e.identityBackUrl ? (
              <div className="mt-2">
                <img src={e.identityBackUrl} alt="ID Back" className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-[#33383f]" />
                <p className="text-[10px] text-gray-500 mt-1 truncate">{e.identityBackName || 'id-back'}</p>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2 text-gray-400">
                <FileText size={14} />
                <span className="text-[10px]">No file uploaded</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <SectionHeader icon={FileText} title="Resume / CV" />
          {hasCv ? (
            <div className="p-3 rounded-xl border border-gray-100 dark:border-[#262b31] bg-gray-50 dark:bg-[#1c2026] flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                <FileText size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{e.cvName || 'resume.pdf'}</p>
                <p className="text-[10px] text-gray-400">{formatDate(e.createdAt)}</p>
              </div>
              <a href={e.cvUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#262b31] text-gray-500 transition-colors">
                <Download size={14} />
              </a>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-gray-200 dark:border-[#33383f] text-center">
              <FileText size={20} className="mx-auto text-gray-300 dark:text-gray-600 mb-1" />
              <p className="text-[10px] text-gray-400">No CV uploaded</p>
            </div>
          )}
        </div>

        <div className="mt-4">
          <SectionHeader icon={Receipt} title="Tax & Pension" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DetailRow icon={Receipt} label="TIN Number" value={e.tin || 'Not provided'} mono />
            <DetailRow icon={Shield} label="Pension ID" value={e.pensionId || 'Not provided'} mono />
          </div>
        </div>

        <div className="mt-4 p-3 rounded-xl bg-gray-50 border border-gray-100 dark:bg-[#1c2026] dark:border-[#262b31] flex items-center gap-3">
          <div className={`p-2 rounded-lg ${hasIdentity ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'}`}>
            {hasIdentity ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500">KYC Status</p>
            <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
              {hasIdentity ? 'Identity Verified' : 'Not Verified — Awaiting document upload'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (activeTab === 'banking') {
    return (
      <div className="space-y-4">
        <SectionHeader icon={CreditCard} title="Bank Account" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DetailRow icon={Building2} label="Bank Name" value={e.bankName || 'Not provided'} />
          <DetailRow icon={Hash} label="Account Number" value={e.bankAccount || 'Not provided'} mono />
        </div>

        <div className="mt-4">
          <SectionHeader icon={Receipt} title="Tax & Pension" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DetailRow icon={Receipt} label="TIN Number" value={e.tin || 'Not provided'} mono />
            <DetailRow icon={Shield} label="Pension ID" value={e.pensionId || 'Not provided'} mono />
          </div>
        </div>
      </div>
    )
  }

  if (activeTab === 'certifications') {
    const certs = e.certifications || []
    return (
      <div className="space-y-4">
        <SectionHeader icon={Award} title={`Certifications (${certs.length})`} />
        {certs.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-gray-200 dark:border-[#33383f] text-center">
            <Award size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-xs text-gray-400">No certifications on file</p>
          </div>
        ) : (
          <div className="space-y-3">
            {certs.map((cert) => (
              <div key={cert.id} className="p-4 rounded-xl border border-gray-100 dark:border-[#262b31] bg-gray-50 dark:bg-[#1c2026]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 shrink-0">
                      <Award size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{cert.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{cert.issuer || '—'}</p>
                    </div>
                  </div>
                  {cert.fileUrl && (
                    <a href={cert.fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#262b31] text-gray-400 transition-colors shrink-0">
                      <Download size={14} />
                    </a>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <p className="text-[9px] uppercase text-gray-400 tracking-wider">Issue Date</p>
                    <p className="text-[10px] font-medium text-gray-700 dark:text-gray-300">{formatDate(cert.issueDate)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase text-gray-400 tracking-wider">Expiry Date</p>
                    <p className="text-[10px] font-medium text-gray-700 dark:text-gray-300">{cert.expiryDate ? formatDate(cert.expiryDate) : 'No expiry'}</p>
                  </div>
                  {cert.fileName && (
                    <div>
                      <p className="text-[9px] uppercase text-gray-400 tracking-wider">File</p>
                      <p className="text-[10px] font-medium text-gray-700 dark:text-gray-300 truncate">{cert.fileName} ({formatFileSize(cert.fileSize)})</p>
                    </div>
                  )}
                </div>
                {cert.expiryDate && daysUntil(cert.expiryDate) !== null && daysUntil(cert.expiryDate) <= 90 && (
                  <div className={`mt-2 px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1 ${
                    daysUntil(cert.expiryDate) < 0
                      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400'
                      : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                  }`}>
                    <AlertTriangle size={10} />
                    {daysUntil(cert.expiryDate) < 0 ? 'Expired' : `Expires in ${daysUntil(cert.expiryDate)} days`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (activeTab === 'actions') {
    return (
      <div className="space-y-4">
        <SectionHeader icon={Shield} title="Change Employment Status" />
        <div className="grid grid-cols-3 gap-2">
          {['Active', 'Onboarding', 'Inactive'].map((st) => (
            <button
              key={st}
              onClick={() => setStatus(st)}
              className={`py-3 px-3 text-xs font-semibold rounded-xl border-2 transition-all cursor-pointer ${
                status === st
                  ? st === 'Active'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-600 dark:text-emerald-400'
                    : st === 'Onboarding'
                    ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:border-amber-600 dark:text-amber-400'
                    : 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:border-rose-600 dark:text-rose-400'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-[#33383f] dark:text-gray-400 dark:hover:bg-[#1c2026]'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                {status === st ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <XCircle size={16} className="text-gray-300 dark:text-gray-600" />
                )}
                {st}
              </div>
            </button>
          ))}
        </div>

        {e.exitDate && (
          <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/30 dark:bg-rose-950/10">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-rose-600 dark:text-rose-400" />
              <p className="text-xs font-medium text-rose-700 dark:text-rose-400">
                Exit date: {formatDate(e.exitDate)}
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-[#262b31]">
          <SectionHeader icon={Trash2} title="Danger Zone" />
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-3">
            Removing this employee will permanently delete their record. This action cannot be undone.
          </p>
        </div>
      </div>
    )
  }

  return null
}

function EmployeeDetailsModal({ employee, isOpen, onClose, onUpdateStatus, onDelete, onEdit, onResetPassword }) {
  const defaultEmployee = getDefaultEmployee()
  const currentEmployee = employee || defaultEmployee
  const [activeTab, setActiveTab] = useState('overview')
  const [status, setStatus] = useState(
    currentEmployee.status || currentEmployee.employmentStatus || 'Active'
  )
  const [resetPasswordNotice, setResetPasswordNotice] = useState('')
  const [resetting, setResetting] = useState(false)
  const [confirmAction, setConfirmAction] = useState('')

  const handleResetPassword = async () => {
    if (!onResetPassword || resetting) return
    if (!confirmAction) { setConfirmAction('reset'); return }
    if (confirmAction !== 'reset') return
    setConfirmAction('')
    setResetting(true)
    setResetPasswordNotice('')
    try {
      // Nothing is emailed to the employee, so the new password comes back in
      // the response and is shown here to pass on. It is the only copy of it.
      const result = await onResetPassword(currentEmployee.id)
      setResetPasswordNotice(
        result?.temporaryPassword
          ? `${result.temporaryPassword} — share it with the employee. It expires once they sign in.`
          : 'The password was reset, but the new value could not be displayed. Try again.',
      )
    } finally {
      setResetting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#15181d] rounded-2xl max-w-5xl w-full max-h-[90vh] shadow-2xl border border-gray-100 dark:border-[#262b31] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-[#262b31] rounded-lg transition-colors z-10"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 dark:bg-[#1c2026] border border-gray-200 dark:border-[#33383f] shadow-md flex items-center justify-center">
              {currentEmployee.avatar ? (
                <img
                  src={currentEmployee.avatar}
                  alt={currentEmployee.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
              ) : null}
              <div className={`w-full h-full flex items-center justify-center text-2xl font-bold text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-[#262b31] ${currentEmployee.avatar ? 'hidden' : 'flex'}`}>
                {currentEmployee.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'EM'}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">{currentEmployee.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {currentEmployee.jobTitle || '—'} • {currentEmployee.department || '—'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono">{currentEmployee.employeeId || '—'}</p>
            </div>
            {onEdit && (
              <button
                onClick={() => onEdit(employee)}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-[#262b31] dark:hover:bg-[#33383f] px-4 text-xs font-semibold text-white transition-colors shrink-0 cursor-pointer"
              >
                <Pencil size={13} />
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-100 dark:border-[#262b31] px-6 overflow-x-auto">
          <div className="flex gap-0.5 min-w-max">
            {TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                      : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon size={13} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <TabPanel employee={currentEmployee} activeTab={activeTab} status={status} setStatus={setStatus} onResetPassword={handleResetPassword} resetPassword={resetPasswordNotice} resetting={resetting} />
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 dark:border-[#262b31] px-6 py-3 flex items-center justify-between bg-gray-50/50 dark:bg-[#1c2026]/50">
          <button
            onClick={() => setConfirmAction('delete')}
            className="flex items-center gap-1.5 text-[11px] font-medium text-rose-600 hover:text-rose-700 px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
            Remove Employee
          </button>
          <div className="flex gap-2">
            {onUpdateStatus && status !== (currentEmployee.status || currentEmployee.employmentStatus || 'Active') && (
              <button
                onClick={() => onUpdateStatus(currentEmployee.id, status)}
                className="px-4 py-2 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
              >
                Save Status
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-[11px] font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-[#262b31] dark:hover:bg-[#2a3139] rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
        {confirmAction && <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-4"><section role="alertdialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#15181d]"><h3 className="font-bold text-gray-900 dark:text-white">{confirmAction === 'delete' ? 'Remove employee?' : 'Reset password?'}</h3><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{confirmAction === 'delete' ? `Remove ${currentEmployee.name}? This action cannot be undone.` : `Reset the login password for ${currentEmployee.name}?`}</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setConfirmAction('')} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600">Cancel</button><button type="button" onClick={() => { if (confirmAction === 'delete') { onDelete(currentEmployee.id); onClose(); setConfirmAction('') } else handleResetPassword() }} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white">Confirm</button></div></section></div>}
      </div>
    </div>
  )
}

export default EmployeeDetailsModal
