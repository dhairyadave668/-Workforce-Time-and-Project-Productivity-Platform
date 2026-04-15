import type{ RouteObject } from 'react-router-dom';
import AuditLogPage from './components/AuditlogPage';
import ProtectedRoute from '@/features/auth/ProtectedRoute';
export const auditlogRoutes: RouteObject[] = [
  {
    path: '/audit-logs',
    element:( 
    <ProtectedRoute allowedRoles={["Admin"]}>
    <AuditLogPage/>
    </ProtectedRoute>
  ),
  }
];