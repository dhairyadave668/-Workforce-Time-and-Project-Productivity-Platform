import axios from "axios"
import type {
  TimesheetHistory,
  TimesheetEntry,
  UpdateRemarkRequest,
} from "../types/approvalTypes"

const API = import.meta.env.VITE_API_BASE_URL


const api = axios.create({
  baseURL: API,
  withCredentials: true, 
})

// GET: Timesheets
export const fetchTimesheets = async (): Promise<TimesheetHistory[]> => {
  const res = await api.get(`/api/timesheets/history`)
  return res.data
}

// GET: Entries
// GET: Entries
export const fetchEntries = async (entraId: string): Promise<TimesheetEntry[]> => {
  const res = await api.get(`/api/approvals/entries`, {
    headers: {
      "entraId": entraId, 
    },
  })
  return res.data
}

// PUT: Update remark
export const updateRemark = async (
  data: UpdateRemarkRequest & { entraId: string }
) => {
  const res = await api.put(`/api/approvals/remark`, data, {
    headers: {
      "entraId": data.entraId, // ✅ send in header
    },
  });

  return res.data;
};