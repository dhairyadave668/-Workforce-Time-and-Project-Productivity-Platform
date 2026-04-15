export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string | null;
  userName: string;
  action: string;
  target: string;
  metadata: string;
  roleId: string | null;
  roleName: string;
}