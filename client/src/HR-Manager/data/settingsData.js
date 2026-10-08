// ─────────────────────────────────────────────────────────────
// HR-MANAGER CENTRAL SETTINGS & CONFIGURATION
// Single source of truth for statutory rules, departments,
// employment types, statuses, and company metadata.
// ─────────────────────────────────────────────────────────────

export const HR_SETTINGS = {
  company: {
    name: 'Yanol Technology PLC',
    shortName: 'Yanol HR',
    address: 'Bole Sub-City, Kebele 03, Addis Ababa, Ethiopia',
    phone: '+251 11 662 4589',
    email: 'hr@yanol.com',
    tin: '0034928172',
    registrationNumber: 'AA-2018-09482',
    currency: 'ETB',
    currencySymbol: 'ETB',
  },

  standardMonthlyHours: 208, // 26 working days × 8 hours

  // Ethiopian Income Tax Brackets (Monthly, ETB) — Proclamation No. 1395/2025
  taxBrackets: [
    { min: 0, max: 2000, rate: 0.00, deduction: 0, label: '0 – 2,000 ETB (0%)' },
    { min: 2001, max: 4000, rate: 0.15, deduction: 300, label: '2,001 – 4,000 ETB (15%)' },
    { min: 4001, max: 7000, rate: 0.20, deduction: 500, label: '4,001 – 7,000 ETB (20%)' },
    { min: 7001, max: 10000, rate: 0.25, deduction: 850, label: '7,001 – 10,000 ETB (25%)' },
    { min: 10001, max: 14000, rate: 0.30, deduction: 1350, label: '10,001 – 14,000 ETB (30%)' },
    { min: 14001, max: Infinity, rate: 0.35, deduction: 2050, label: 'Above 14,000 ETB (35%)' },
  ],

  // Pension Rates — Public Servants / Private Organization Pension (Proc. No. 715/2011)
  // Computed on basic salary only, explicitly excluding allowances
  pension: {
    employeeRate: 0.07, // 7% employee contribution
    employerRate: 0.11, // 11% employer contribution
    totalRate: 0.18,    // 18% combined statutory contribution
  },

  // Overtime Rules (Labour Proclamation No. 1156/2019, Art. 68)
  overtimeMultiplier: 1.25,
  overtimeTiers: [
    { label: 'Daytime normal OT (6:00 AM – 10:00 PM)', multiplier: 1.25 },
    { label: 'Night shift / Weekly rest day', multiplier: 1.50 },
    { label: 'Public holidays', multiplier: 2.00 },
  ],

  // Annual Leave Entitlement (Tenure-based per Labour Proclamation)
  // 16 days base for year 1, +1 day for every 2 additional full years of service
  leave: {
    baseEntitlement: 16,
    extraDayPerFullYears: 2,
    sickDaysPerYear: 10,
    maternityDays: 120,
    paternityDays: 3,
  },

  // Central Departments list (dynamically managed by Admin in HR Settings)
  departments: [],
  jobTitles: [],

  employmentTypes: ['Permanent', 'Contractual', 'Intern'],
  employmentStatuses: ['Active', 'On Leave', 'Resigned', 'Terminated'],
  leaveTypes: ['Annual', 'Sick', 'Maternity', 'Paternity', 'Unpaid', 'Study'],
  attendanceStatuses: ['Present', 'Absent', 'Sick Leave', 'On Leave'],
  approvalStatuses: ['Pending', 'Approved', 'Rejected'],
  genders: ['Female', 'Male'],
}

