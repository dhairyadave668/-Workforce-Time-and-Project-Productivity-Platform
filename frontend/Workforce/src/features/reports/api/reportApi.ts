import api from '@/features/auth/utils/axios';

export interface Project {
  id: string;
  name: string;
  client?: string;
  status: string;
  plannedHours: number;
  loggedHrs: number;
  memberIds?: string[];
  memberAllocations?: { userId: string; allocatedHours: number }[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  isDeleted?: boolean;
}

export interface TimesheetEntry {
  id: string;
  userId: string;
  userName?: string;
  projectId: string | null;
  projectName?: string;
  taskId: string;
  taskName?: string;
  entryDate: string;
  hours: number;
  note?: string;
}

export type ReportType = 'weekly' | 'monthly' | 'all' | 'dateRange';

// Existing endpoints (kept for backward compatibility)
export const fetchProjects = async (
  status?: string,
  search?: string,
  userId?: string
): Promise<Project[]> => {
  const params = new URLSearchParams();
  if (status && status !== "all") params.set("status", status);
  if (search) params.set("search", search);
  if (userId) params.set("userId", userId);
  const response = await api.get(`/projects?${params.toString()}`);
  return response.data;
};

export const fetchUsers = async (): Promise<User[]> => {
  const response = await api.get('/users');
  return response.data;
};

export const fetchTimesheets = async (excludePending = false): Promise<TimesheetEntry[]> => {
  const url = excludePending ? '/api/timesheets/entries?excludePending=true' : '/api/timesheets/entries';
  const response = await api.get(url);
  return response.data;
};

// ========== NEW REPORT ENDPOINTS ==========
export interface ProjectReportDto {
  projectId: string;
  projectName: string;
  plannedHours: number;
  loggedHours: number;
  percentComplete: number;
  headcount: number;
}

export interface UserReportDto {
  userId: string;
  userName: string;
  projects: ProjectReportDto[];
}

export interface ProjectBreakdownDto {
  userId: string;
  userName: string;
  loggedHours: number;
  plannedHours: number;
  percentComplete: number;
}

export interface UserProjectRowDto {
  userId: string;
  userName: string;
  projectId: string;
  projectName: string;
  hours: number;
  plannedHours: number;
  percentComplete: number;
  headcount: number;
}

export const fetchProjectSummary = async (start?: string, end?: string): Promise<ProjectReportDto[]> => {
  const params = new URLSearchParams();
  if (start) params.append('start', start);
  if (end) params.append('end', end);
  const response = await api.get(`/api/reports/project-summary?${params}`);
  return response.data;
};

export const fetchUserSummary = async (userId?: string, start?: string, end?: string): Promise<UserReportDto[]> => {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  if (start) params.append('start', start);
  if (end) params.append('end', end);
  const response = await api.get(`/api/reports/user-summary?${params}`);
  return response.data;
};

export const fetchUserProjectMatrix = async (
  userId?: string,
  projectId?: string,
  start?: string,
  end?: string
): Promise<UserProjectRowDto[]> => {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  if (projectId) params.append('projectId', projectId);
  if (start) params.append('start', start);
  if (end) params.append('end', end);
  const response = await api.get(`/api/reports/user-project-matrix?${params}`);
  return response.data;
};

export const fetchProjectBreakdown = async (
  projectId: string,
  start?: string,
  end?: string
): Promise<ProjectBreakdownDto[]> => {
  const params = new URLSearchParams();
  params.append('projectId', projectId);
  if (start) params.append('start', start);
  if (end) params.append('end', end);
  const response = await api.get(`/api/reports/project-breakdown?${params}`);
  return response.data;
};

// Helper: format a Date object as YYYY-MM-DD in local time
export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper: get first and last day of a month given YYYY-MM (local time)
export const getMonthRange = (month: string): { start: string; end: string } => {
  const [year, monthNum] = month.split('-').map(Number);
  const start = new Date(year, monthNum - 1, 1);
  const end = new Date(year, monthNum, 0);
  return { start: formatLocalDate(start), end: formatLocalDate(end) };
};

// Helper: get current week (Monday to Sunday) as YYYY-MM-DD (local time)
export const getCurrentWeekRange = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { weekStart: formatLocalDate(monday), weekEnd: formatLocalDate(sunday) };
};

// Helper: extract month from YYYY-MM-DD
export const getMonthFromDate = (date: string): string => date.slice(0, 7);

export const OTHERS_PROJECT_ID = '00000000-0000-0000-0000-000000000000';
export const OTHERS_PROJECT_NAME = 'Others';