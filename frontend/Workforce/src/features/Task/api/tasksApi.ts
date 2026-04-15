import { handleResponse } from "../../../shared/api/apiClient";
import api from "../../auth/utils/axios";
const API = `${import.meta.env.VITE_API_BASE_URL}/api/tasks`;

/* ================= TYPES ================= */

export type ApiTask = {
  id: string;
  name: string;
  priority: "Low" | "Medium" | "High";
  status: "Pending" | "In Progress" | "Completed";
  task_Hours: number;
  projectId: string | null;
  projectName: string | null;
  created_On: string;
  updated_On: string;
  originalHours?: number;
};

export type TaskInput = {
  name: string;
  priority: "Low" | "Medium" | "High";
  status: "Pending" | "In Progress" | "Completed";
  task_Hours: number;
  projectId: string | null;
  entraId: string; // REQUIRED now for all operations
};

/* ================= FETCH ================= */

export const fetchTasks = async (): Promise<ApiTask[]> => {
  const res = await fetch(API);
  const data = await handleResponse(res);

  // Sort newest first
  return data.sort(
    (a: ApiTask, b: ApiTask) =>
      new Date(b.created_On).getTime() -
      new Date(a.created_On).getTime()
  );
};
// tasksApi.ts
export const fetchNonPendingTasks = async (): Promise<ApiTask[]> => {
  const response = await api.get('/api/tasks?excludePending=true');
  return response.data;
};
/* ================= CREATE ================= */

export const createTask = async (task: TaskInput): Promise<ApiTask> => {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(task),
  });

  return handleResponse(res);
};

/* ================= UPDATE ================= */

export const updateTask = async ({
  id,
  data,
}: {
  id: string;
  data: TaskInput;
}) => {
  // 🔹 Log full data
  console.log("Update Task Data:", data);

  // 🔹 Log entraId specifically (if exists)
  console.log("entraId:", data?.entraId);

  const res = await fetch(`${API}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Failed to update task");

  if (res.status === 204) return null;

  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

/* ================= DELETE ================= */

export const deleteTask = async ({
  id,
  entraId,
}: {
  id: string;
  entraId: string;
}) => {
  const res = await fetch(`${API}/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "entraid": entraId,
    },
    body: JSON.stringify({ entraId }),
    
  });

  await handleResponse(res);
};

/* ================= STATUS UPDATE ================= */

export const updateTaskStatus = async ({
  id,
  status,
  entraId,
}: {
  id: string;
  status: ApiTask["status"];
  entraId: string;
}) => {
  const res = await fetch(`${API}/${id}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status, entraId }),
  });

  await handleResponse(res);

  return { id, status };
};