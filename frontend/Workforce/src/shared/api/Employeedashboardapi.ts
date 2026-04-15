const BASE_URL = import.meta.env.VITE_API_BASE_URL;
import api from "@/features/auth/utils/axios";

const defaultHeaders = () => ({
  "Content-Type": "application/json",
});

/* ================= TYPES ================= */
export type ActivityItem = {
  id: string;
  entryDate: string;
  status: string;
  submittedAt: string | null;
  approvedAt: string | null;
  adminRemarks: string | null;
};

/* ================= API FUNCTIONS ================= */

/**
 * Fetches the number of projects assigned to a specific user.
 * Uses the backend endpoint that counts distinct projects from ProjectAssignments.
 */
export const fetchProjectCount = async (entraId: string): Promise<number> => {
  try {
    const res = await api.get('/projects/count', {
      params: { entraId }
    });
    return res.data.count;
  } catch (error) {
    console.error("Failed to fetch project count:", error);
    return 0;
  }
};

export const fetchWeeklyHours = async (entraId: string): Promise<number> => {
  try {
    const res = await fetch(
      `${BASE_URL}/api/timesheets/weekly-hours/${entraId}`,
      { headers: defaultHeaders() }
    );
    if (!res.ok) return 0;
    const data: { totalHours: number } = await res.json();
    return data.totalHours;
  } catch {
    return 0;
  }
};

export const fetchRemarksCount = async (entraId: string): Promise<number> => {
  try {
    const res = await fetch(
      `${BASE_URL}/api/timesheets/admin-remarks-count/${entraId}`,
      { headers: defaultHeaders() }
    );
    if (!res.ok) return 0;
    const data: { totalRemarks: number } = await res.json();
    return data.totalRemarks;
  } catch {
    return 0;
  }
};

export const fetchRemarksList = async (
  entraId: string
): Promise<ActivityItem[]> => {
  try {
    const res = await fetch(
      `${BASE_URL}/api/timesheets/history/${entraId}`,
      { headers: defaultHeaders() }
    );
    if (!res.ok) return [];
    const data: ActivityItem[] = await res.json();
    return data.filter((item) => item.adminRemarks);
  } catch {
    return [];
  }
};