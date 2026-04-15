/* ================= TIMESHEET HISTORY ================= */

export type TimesheetHistory = {
  id: string
  timesheetId: string
  entryDate: string
  status: string
  submittedAt: string | null
}

/* ================= TIMESHEET ENTRY ================= */

export type TimesheetEntry = {
  id: string
  entryDate: string
  hours: number
  note?: string

  projectId: string | null
  projectName: string | null

  taskId: string
  taskName: string

  userName: string | null        // ✅ camelCase
  timesheetId: string
  adminRemarks?: string          // ✅ camelCase
}

/* ================= REQUEST TYPES ================= */

export type UpdateRemarkRequest = {
  timesheetId: string
  entryDate?: string
  adminRemarks: string          
  entraId?: string | null// ✅ camelCase
}