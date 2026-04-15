/* ================= CORE TYPES ================= */

export interface TimesheetEntry {
  projectId: string | null
  taskId: string | null
  entryDate: string
  hours: number
  note?: string
}

export interface TimesheetRequest {
  entraId: string
  status: "draft" | "submitted"
  entries: TimesheetEntry[]
}

/* ================= API RESPONSE TYPES ================= */

export type Task = {
  id: string
  name: string
  projectId: string
}

export type Project = {
  id: string
  name: string
}

export type TimesheetHistoryItem = {
  id: string
  timesheetId: string
  entryDate: string
  status: string
  submittedAt: string | null
  approvedAt: string | null
  adminRemarks: string | null
}

export type ApiEntry = {
  id: string
  projectId: string | null
  taskId: string | null
  entryDate: string
  hours: number
  note: string
}

/* ================= UI TYPES ================= */

export type DayEntry = {
  hours: number
  note: string
}

export type Row = {
  id: string
  project: string
  task: string
  days: DayEntry[]
}