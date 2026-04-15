import type{
  TimesheetRequest,
  Task,
  Project,
  ApiEntry,
  TimesheetHistoryItem
} from "../types/timesheetTypes"
import api from "../../auth/utils/axios"; 

const API = import.meta.env.VITE_API_BASE_URL

export const fetchTasks = async (): Promise<Task[]> => {
  const res = await fetch(`${API}/api/tasks`)  // ← changed
  if (!res.ok) throw new Error("Failed to fetch tasks")
  return res.json()
}

// ==================== PROJECTS ====================
export const fetchProjects = async (): Promise<Project[]> => {
  try {
    const res = await api.get('/projects');
    return res.data; // axios returns data directly
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    throw new Error("Failed to fetch projects");
  }
};
export const fetchTimesheetEntries = async (
  entraId: string
): Promise<ApiEntry[]> => {
  const res = await fetch(`${API}/api/timesheets/entries/${entraId}`)
  if (!res.ok) throw new Error("Failed to fetch entries")
  return res.json()
}

export const fetchTimesheetHistory = async (
  entraId: string
): Promise<TimesheetHistoryItem[]> => {
  const res = await fetch(`${API}/api/timesheets/history/${entraId}`)
  if (!res.ok) throw new Error("Failed to fetch history")
  return res.json()
}

export const saveDraftTimesheet = async (
  data: TimesheetRequest
) => {
  const res = await fetch(`${API}/api/timesheets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, status: "draft" })
  })

  if (!res.ok) throw new Error("Draft save failed")
  return res.json()
}

export const submitTimesheet = async (
  data: TimesheetRequest
) => {
  const res = await fetch(`${API}/api/timesheets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, status: "submitted" })
  })

  if (!res.ok) throw new Error("Submit failed")
  return res.json()
}