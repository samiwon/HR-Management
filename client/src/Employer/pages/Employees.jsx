import { useState, useMemo, useEffect } from 'react'
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Download,
  Trash2,
  X,
} from 'lucide-react'
import { INITIAL_EMPLOYEES, DEPARTMENTS, STATUSES } from '../data/employeeData'
import { SETTINGS } from '../data/settingsData'
import { formatETB } from '../lib/payroll'
import AddEmployeeModal from '../components/AddEmployeeModal'
import EmployeeDetailsModal from '../components/EmployeeDetailsModal'
import DirectoryView from '../components/DirectoryView'
import OrgChartView from '../components/OrgChartView'
import { fetchEmployees, createEmployee, resetEmployeePassword } from '../lib/employerApi'

function Employees() {
  const [employees, setEmployees] = useState([])
  const [activeTab, setActiveTab] = useState('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDept, setSelectedDept] = useState('All Departments')
  const [selectedStatus, setSelectedStatus] = useState('All Statuses')
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')

  const [selectedIds, setSelectedIds] = useState([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [showFilterPopover, setShowFilterPopover] = useState(false)
  const [showSortPopover, setShowSortPopover] = useState(false)
  const [recordsPerPage, setRecordsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [toastMessage, setToastMessage] = useState(null)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)

  useEffect(() => {
    fetchEmployees()
      .then((data) => setEmployees(Array.isArray(data) ? data : []))
      .catch((error) => showToast(error.message || 'Failed to load employees'))
  }, [])

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const filteredEmployees = useMemo(() => {
    return employees
      .filter((emp) => {
        const matchesSearch =
          emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.department.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesDept = selectedDept === 'All Departments' || emp.department === selectedDept
        const matchesStatus =
          selectedStatus === 'All Statuses' ||
          emp.employmentStatus === selectedStatus ||
          emp.status === selectedStatus

        return matchesSearch && matchesDept && matchesStatus
      })
      .sort((a, b) => {
        let fieldA = a[sortField] || ''
        let fieldB = b[sortField] || ''
        if (typeof fieldA === 'string') fieldA = fieldA.toLowerCase()
        if (typeof fieldB === 'string') fieldB = fieldB.toLowerCase()
        if (fieldA < fieldB) return sortDirection === 'asc' ? -1 : 1
        if (fieldA > fieldB) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
  }, [employees, searchTerm, selectedDept, selectedStatus, sortField, sortDirection])

  const handleSort = (field) => {
    if (sortField === field) setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleSelectAll = (e) => {
    setSelectedIds(e.target.checked ? filteredEmployees.map((emp) => emp.id) : [])
  }

  const handleSelectRow = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))

  const handleAddEmployee = async (newEmp) => {
    const result = await createEmployee(newEmp)
    const savedEmployee = result.employee || result
    setEmployees((current) => [savedEmployee, ...current])
    showToast(`Added ${savedEmployee.name} to the team`)
  }

  const handleUpdateStatus = (id, newStatus) => {
    setEmployees(employees.map((e) => (e.id === id ? { ...e, status: newStatus, employmentStatus: newStatus } : e)))
    if (selectedEmployee?.id === id) setSelectedEmployee((prev) => ({ ...prev, status: newStatus }))
    showToast(`Updated status to ${newStatus}`)
  }

  const handleResetPassword = async (id) => {
    try {
      return await resetEmployeePassword(id)
    } catch (error) {
      showToast(error.message || 'Failed to reset employee password')
      throw error
    }
  }

  const handleDeleteEmployee = (id) => {
    setEmployees(employees.filter((e) => e.id !== id))
    setSelectedIds(selectedIds.filter((i) => i !== id))
    showToast('Employee deleted successfully')
  }

  const handleBulkDelete = () => {
    setConfirmBulkDelete(true)
  }

  const handleExportCSV = () => {
    const list = selectedIds.length > 0 ? employees.filter((e) => selectedIds.includes(e.id)) : filteredEmployees
    const headers = ['Employee ID', 'Name', 'Gender', 'Job Title', 'Department', 'Employment Type', 'Basic Salary', 'TIN', 'Status']
    const rows = list.map((e) => [
      `"${e.employeeId}"`,
      `"${e.name}"`,
      `"${e.gender}"`,
      `"${e.jobTitle}"`,
      `"${e.department}"`,
      `"${e.employmentType}"`,
      `"${e.basicSalary}"`,
      `"${e.tin}"`,
      `"${e.employmentStatus}"`,
    ])
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const link = document.createElement('a')
    link.href = encodeURI(csv)
    link.download = `employees_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast(`Exported ${list.length} employees to CSV`)
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-gray-950 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-medium animate-in fade-in duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950">Employees</h1>
          <p className="text-xs text-gray-500 mt-1">Master employee registry — {employees.length} records, {SETTINGS.standardMonthlyHours} standard hours/mo</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold transition-colors flex items-center gap-2"
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-gray-950 hover:bg-gray-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Plus size={15} />
            Add new
          </button>
        </div>
      </div>

      {/* View switcher + controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="inline-flex p-1 bg-[#eceef1] rounded-xl border border-gray-200/70 w-fit">
          {[
            { id: 'list', label: 'Employee list' },
            { id: 'directory', label: 'Directory' },
            { id: 'org', label: 'ORG Chart' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === t.id ? 'bg-white text-gray-950 shadow-2xs' : 'text-gray-600 hover:text-gray-950'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-48 sm:w-56 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 shadow-2xs"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => { setShowFilterPopover(!showFilterPopover); setShowSortPopover(false) }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition-colors shadow-2xs ${
                selectedDept !== 'All Departments' || selectedStatus !== 'All Statuses'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>Filter</span>
            </button>
            {showFilterPopover && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-100">
                  <span className="text-xs font-bold text-gray-900">Filters</span>
                  <button onClick={() => { setSelectedDept('All Departments'); setSelectedStatus('All Statuses') }} className="text-[10px] text-gray-500 hover:text-gray-800 underline">
                    Reset
                  </button>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Department</label>
                    <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="w-full p-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:bg-white">
                      {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Status</label>
                    <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="w-full p-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:bg-white">
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => { setShowSortPopover(!showSortPopover); setShowFilterPopover(false) }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 flex items-center gap-1.5 shadow-2xs"
            >
              <ArrowUpDown size={13} />
              <span>Sort</span>
            </button>
            {showSortPopover && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-200 p-2 z-50">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1">Sort By</p>
                {[
                  { label: 'Name', field: 'name' },
                  { label: 'Employee ID', field: 'employeeId' },
                  { label: 'Job Title', field: 'jobTitle' },
                  { label: 'Department', field: 'department' },
                  { label: 'Join Date', field: 'joinDate' },
                ].map((opt) => (
                  <button
                    key={opt.field}
                    onClick={() => { handleSort(opt.field); setShowSortPopover(false) }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                      sortField === opt.field ? 'bg-gray-100 text-gray-950 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {sortField === opt.field && (
                      <span className="text-[10px] text-gray-500 font-mono">{sortDirection === 'asc' ? '↑ ASC' : '↓ DESC'}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main view */}
      {activeTab === 'directory' ? (
        <DirectoryView
          employees={filteredEmployees}
          onSelectEmployee={(emp) => { setSelectedEmployee(emp); setIsDetailsModalOpen(true) }}
          onUpdateStatus={handleUpdateStatus}
        />
      ) : activeTab === 'org' ? (
        <OrgChartView
          employees={filteredEmployees}
          onSelectEmployee={(emp) => { setSelectedEmployee(emp); setIsDetailsModalOpen(true) }}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-medium text-gray-500 select-none">
                  <th className="py-3.5 pl-5 pr-2 w-10">
                    <input
                      type="checkbox"
                      checked={filteredEmployees.length > 0 && selectedIds.length === filteredEmployees.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-3">
                    <button onClick={() => handleSort('name')} className="flex items-center gap-1.5 hover:text-gray-900">
                      <span>Name of employee</span>
                      <ArrowUpDown size={12} className="text-gray-400" />
                    </button>
                  </th>
                  <th className="py-3.5 px-3">
                    <button onClick={() => handleSort('employeeId')} className="flex items-center gap-1.5 hover:text-gray-900">
                      <span>Employee ID</span>
                      <ArrowUpDown size={12} className="text-gray-400" />
                    </button>
                  </th>
                  <th className="py-3.5 px-3">
                    <button onClick={() => handleSort('jobTitle')} className="flex items-center gap-1.5 hover:text-gray-900">
                      <span>Job title</span>
                      <ArrowUpDown size={12} className="text-gray-400" />
                    </button>
                  </th>
                  <th className="py-3.5 px-3">
                    <button onClick={() => handleSort('department')} className="flex items-center gap-1.5 hover:text-gray-900">
                      <span>Department</span>
                      <ArrowUpDown size={12} className="text-gray-400" />
                    </button>
                  </th>
                  <th className="py-3.5 px-3">
                    <button onClick={() => handleSort('basicSalary')} className="flex items-center gap-1.5 hover:text-gray-900">
                      <span>Basic</span>
                      <ArrowUpDown size={12} className="text-gray-400" />
                    </button>
                  </th>
                  <th className="py-3.5 px-3">
                    <button onClick={() => handleSort('joinDate')} className="flex items-center gap-1.5 hover:text-gray-900">
                      <span>Join date</span>
                      <ArrowUpDown size={12} className="text-gray-400" />
                    </button>
                  </th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 pr-5 pl-2 text-right w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-400">No employees match your search or filter criteria.</td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const isSelected = selectedIds.includes(emp.id)
                    const badgeColor =
                      emp.employmentStatus === 'Active' || emp.status === 'Active'
                        ? 'border-emerald-400 text-emerald-600'
                        : emp.employmentStatus === 'On Leave' || emp.status === 'Onboarding'
                          ? 'border-amber-300 text-amber-600'
                          : 'border-rose-300 text-rose-500'
                    return (
                      <tr key={emp.id} className={`hover:bg-gray-50/70 transition-colors ${isSelected ? 'bg-gray-50/90' : ''}`}>
                        <td className="py-3.5 pl-5 pr-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(emp.id)}
                            className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={emp.avatar}
                              alt={emp.name}
                              className="w-8 h-8 rounded-full object-cover bg-gray-100 shrink-0"
                              onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' }}
                            />
                            <div className="min-w-0">
                              <p
                                onClick={() => { setSelectedEmployee(emp); setIsDetailsModalOpen(true) }}
                                className="font-semibold text-gray-950 hover:text-indigo-600 cursor-pointer truncate"
                              >
                                {emp.name}
                              </p>
                              <p className="text-[11px] text-gray-400 truncate">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            onClick={() => { setSelectedEmployee(emp); setIsDetailsModalOpen(true) }}
                            className="font-medium text-gray-900 underline underline-offset-2 decoration-gray-400 cursor-pointer hover:text-indigo-600 transition-colors"
                          >
                            {emp.employeeId}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-gray-700">{emp.jobTitle}</td>
                        <td className="py-3.5 px-3 text-gray-700">{emp.department}</td>
                        <td className="py-3.5 px-3 text-gray-700 whitespace-nowrap">{formatETB(emp.basicSalary)}</td>
                        <td className="py-3.5 px-3 text-gray-700 whitespace-nowrap">{emp.joinDate}</td>
                        <td className="py-3.5 px-3 text-center">
                          <span className={`border rounded-full px-3 py-0.5 text-[11px] font-medium inline-block text-center w-24 bg-white ${badgeColor}`}>
                            {emp.employmentStatus === 'On Leave' && emp.status === 'Inactive' ? 'Inactive' : emp.employmentStatus}
                          </span>
                        </td>
                        <td className="py-3.5 pr-5 pl-2 text-right relative">
                          <button onClick={() => setActiveMenuId(activeMenuId === emp.id ? null : emp.id)} className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                            <MoreVertical size={16} />
                          </button>
                          {activeMenuId === emp.id && (
                            <div className="absolute right-6 top-8 w-40 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-40 text-left">
                              <button onClick={() => { setSelectedEmployee(emp); setIsDetailsModalOpen(true); setActiveMenuId(null) }} className="w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 text-left">
                                View details
                              </button>
                              <button
                                onClick={() => { handleUpdateStatus(emp.id, emp.status === 'Active' ? 'Inactive' : 'Active'); setActiveMenuId(null) }}
                                className="w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 text-left"
                              >
                                Toggle Active/Inactive
                              </button>
                              <div className="my-1 border-t border-gray-100" />
                              <button onClick={() => { handleDeleteEmployee(emp.id); setActiveMenuId(null) }} className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 text-left">
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-gray-600">
              <select
                value={recordsPerPage}
                onChange={(e) => setRecordsPerPage(Number(e.target.value))}
                className="bg-transparent text-gray-700 font-medium py-1 px-2 rounded-lg border border-gray-200 hover:border-gray-300 focus:outline-none"
              >
                <option value={10}>10 records</option>
                <option value={20}>20 records</option>
                <option value={50}>50 records</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setCurrentPage(1)} className={`w-7 h-7 rounded-lg text-xs font-semibold ${currentPage === 1 ? 'bg-gray-950 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                1
              </button>
              <button onClick={() => setCurrentPage(2)} className={`w-7 h-7 rounded-lg text-xs font-semibold ${currentPage === 2 ? 'bg-gray-950 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                2
              </button>
              <button disabled={currentPage === 2} onClick={() => setCurrentPage((p) => Math.min(2, p + 1))} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="text-gray-500 font-medium">1 - {employees.length} of {employees.length}</div>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-950 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="text-xs font-medium text-gray-300">{selectedIds.length} employee(s) selected</span>
          <div className="h-4 w-px bg-gray-800" />
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 text-xs font-semibold text-white hover:text-gray-300">
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button onClick={handleBulkDelete} className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300">
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
          <button onClick={() => setSelectedIds([])} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X size={14} />
          </button>
        </div>
      )}

      <AddEmployeeModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={handleAddEmployee} />
      <EmployeeDetailsModal
        isOpen={isDetailsModalOpen}
        employee={selectedEmployee}
        onClose={() => { setIsDetailsModalOpen(false); setSelectedEmployee(null) }}
        onUpdateStatus={handleUpdateStatus}
        onDelete={handleDeleteEmployee}
        onResetPassword={handleResetPassword}
      />
      {confirmBulkDelete && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"><section role="alertdialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"><h2 className="font-bold text-gray-900">Delete selected employees?</h2><p className="mt-2 text-sm text-gray-600">Delete {selectedIds.length} selected employee(s)? This action cannot be undone.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setConfirmBulkDelete(false)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold">Cancel</button><button type="button" onClick={() => { setEmployees(employees.filter((e) => !selectedIds.includes(e.id))); setSelectedIds([]); setConfirmBulkDelete(false); showToast('Selected employees removed') }} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white">Delete employees</button></div></section></div>}
    </div>
  )
}

export default Employees
