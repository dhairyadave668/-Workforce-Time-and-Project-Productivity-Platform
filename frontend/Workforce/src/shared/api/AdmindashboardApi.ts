import api from "@/features/auth/utils/axios";

/* ================= TYPES ================= */

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  status: string;
  plannedHours: number;
  loggedHrs: number;
}

/* ================= API CALLS ================= */

// USERS
export const fetchUsers = async (): Promise<User[]> => {
  const res = await api.get("/users");
  return res.data;
};

// PROJECTS
export const fetchProjects = async (): Promise<Project[]> => {
  const res = await api.get("/projects");
  return res.data;
};

// REMARKS COUNT
export const fetchRemarksCount = async (): Promise<number> => {
  const res = await api.get("/api/approvals/remarks/count");
  return res.data;
};
