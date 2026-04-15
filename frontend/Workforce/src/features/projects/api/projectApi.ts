import type { Project, User } from "../components/ProjectComponents";
import api from "../../auth/utils/axios"; // Import configured axios instance

/* -------------------------------------------------------------------------- */
/*                                Backend Types                               */
/* -------------------------------------------------------------------------- */

interface BackendProject {
  id: string;
  name: string;
  client: string;
  status: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  plannedHours?: number;
  loggedHrs?: number;
  color?: string;
  memberAllocations?: {
    userId: string;
    hours: number;
    userName?: string;   // ← added
    userEmail?: string;  // ← added
  }[];
}

interface BackendTask {
  id: string;
  name: string;
  projectId: string;
  status?: string;
}

interface BackendTimesheet {
  id: string;
  dailyTimesheetId: string;
  userId: string;
  projectId: string;
  taskId?: string;
  entryDate: string;
  hours: number;
  note?: string;
  created_On: string;
  updated_On: string;
}

const statusToBackend: Record<string, string> = {
  active: "Active",
  planning: "Planning",
  "on-hold": "OnHold",
  completed: "Completed",
};

const statusFromBackend: Record<string, string> = {
  Active: "active",
  Planning: "planning",
  OnHold: "on-hold",
  Completed: "completed",
};

function transformProjectFromBackend(backendProject: BackendProject): Project {
  let frontendStatus = statusFromBackend[backendProject.status];
  if (!frontendStatus) {
    frontendStatus = backendProject.status.toLowerCase().replace(/\s+/g, "-");
  }
  return {
    id: backendProject.id,
    name: backendProject.name,
    client: backendProject.client,
    status: frontendStatus,
    description: backendProject.description ?? null,
    startDate: backendProject.startDate ?? null,
    endDate: backendProject.endDate ?? null,
    plannedHours: backendProject.plannedHours ?? 0,
    loggedHrs: backendProject.loggedHrs ?? 0,
    color: backendProject.color,
    memberAllocations:
      backendProject.memberAllocations?.map((alloc) => ({
        userId: alloc.userId,
        allocatedHours: alloc.hours,
        userName: alloc.userName,      // ← preserve user name
        userEmail: alloc.userEmail,    // ← preserve user email
      })) ?? [],
  };
}

function transformProjectToBackend(
  projectData: Partial<Project>
): Partial<BackendProject> {
  const payload: Partial<BackendProject> = {
    name: projectData.name,
    client: projectData.client,
    status: statusToBackend[projectData.status!] || projectData.status,
    description: projectData.description ?? undefined,
    startDate: projectData.startDate ?? undefined,
    endDate: projectData.endDate ?? undefined,
    plannedHours: projectData.plannedHours,
    color: projectData.color ?? undefined,
    memberAllocations: projectData.memberAllocations?.map((alloc) => ({
      userId: alloc.userId,
      hours: alloc.allocatedHours,
    })),
  };
  Object.keys(payload).forEach((key) => {
    if (payload[key as keyof BackendProject] === undefined) {
      delete payload[key as keyof BackendProject];
    }
  });
  return payload;
}

export async function fetchProjects(
  status?: string,
  search?: string,
  userId?: string
): Promise<Project[]> {
  const params = new URLSearchParams();
  if (status && status !== "all") {
    const backendStatus = statusToBackend[status];
    if (backendStatus) params.set("status", backendStatus);
  }
  if (search) params.set("search", search);
    if (userId) params.set("userId", userId);   // ✅ new: filter by user
  const res = await api.get(`/projects?${params.toString()}`);
  const backendProjects: BackendProject[] = res.data;
  return backendProjects.map(transformProjectFromBackend);
}

export async function createProject(data: Partial<Project>): Promise<Project> {
  const payload = transformProjectToBackend(data);
  const res = await api.post('/projects', payload);
  const backendProject: BackendProject = res.data;
  return transformProjectFromBackend(backendProject);
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project> {
  const payload = transformProjectToBackend(data);
  const res = await api.put(`/projects/${id}`, payload);
  const backendProject: BackendProject = res.data;
  return transformProjectFromBackend(backendProject);
}

// Delete project by ID
export async function deleteProject(id: string): Promise<void> {
  await api.delete(`/projects/${id}`);
}

export async function fetchUsers(): Promise<User[]> {
  const res = await api.get('/users');
  return res.data;
}

export async function fetchCurrentUser(): Promise<User> {
  const res = await api.get('/users/me');
  return res.data;
}

export async function fetchCurrentUserByEntraId(entraId: string): Promise<{ id: string; name: string; email: string; role: string }> {
  const res = await api.get(`/users/by-entraid/${entraId}`);
  return res.data;
}

export async function fetchTasks(): Promise<BackendTask[]> {
  const res = await api.get('/tasks');
  return res.data;
}

export async function fetchTimesheets(excludePending = false): Promise<BackendTimesheet[]> {
  const url = excludePending ? '/api/timesheets/entries?excludePending=true' : '/api/timesheets/entries';
  const res = await api.get(url);
  return res.data;
}
// Add this to your projectApi.ts file
export const fetchProjectsWithLoggedHours = async (
  status?: string,
  search?: string
): Promise<Project[]> => {
  const params = new URLSearchParams();
  if (status && status !== "all") {
    const backendStatus = statusToBackend[status];
    if (backendStatus) params.set("status", backendStatus);
  }
  if (search) params.set("search", search);
  const res = await api.get(`/projects/with-logged-hours?${params.toString()}`);
  const backendProjects: BackendProject[] = res.data;
  return backendProjects.map(transformProjectFromBackend);
};
export const fetchFilteredTimesheets = async (): Promise<BackendTimesheet[]> => {
  return fetchTimesheets(true);
};