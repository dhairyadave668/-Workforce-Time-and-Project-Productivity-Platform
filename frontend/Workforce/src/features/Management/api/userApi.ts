// src/features/user/api/userApi.ts
import api from "@/features/auth/utils/axios";
import type { User, CreateUserPayload } from "../types/userTypes";

// const API = import.meta.env.VITE_API_BASE_URL;

// =========================================================
// USER APIs (all use api, which attaches JWT token automatically)
// =========================================================

/* ================= CURRENT USER ================= */
export const fetchCurrentUser = async (): Promise<User> => {
  const res = await api.get("/me");
  return res.data;
};

/* ================= GET ALL USERS (ADMIN) ================= */
export const fetchUsers = async (): Promise<User[]> => {
  const res = await api.get("/users");
  return res.data;
};

/* ================= GET EMPLOYEES (DROPDOWN) ================= */
export const fetchEmployees = async (): Promise<User[]> => {
  const res = await api.get("/all-users");
  return res.data;
};

/* ================= CREATE USER ================= */
export const createUser = async (payload: CreateUserPayload): Promise<User> => {
  const res = await api.post("/users", payload);
  return res.data;
};

/* ================= UPDATE ROLE ================= */
export const updateUserRole = async (id: string, role: string): Promise<User> => {
  const res = await api.put(`/users/${id}/role`, { roleName: role });
  return res.data;
};

/* ================= DELETE USER ================= */
export const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`/users/${id}`);
};

/* ================= FETCH USER BY ENTRA ID ================= */
export const fetchUserByEntraId = async (entraId: string): Promise<User> => {
  const res = await api.get(`/users/by-entraid/${entraId}`);
  return res.data;
};