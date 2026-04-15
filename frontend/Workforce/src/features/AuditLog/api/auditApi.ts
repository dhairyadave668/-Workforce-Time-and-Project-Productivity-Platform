import type { AuditLog } from "../types/auditTypes";

const API = `${import.meta.env.VITE_API_BASE_URL}/api/audit-logs`;

export const fetchAuditLogs = async (entraId: string): Promise<AuditLog[]> => {
  const response = await fetch(`${API}`, {
    method: "GET",
    headers: {
      accept: "*/*",
      entraId: entraId,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};