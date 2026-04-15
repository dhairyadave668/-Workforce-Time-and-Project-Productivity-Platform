import type{ RouteObject } from 'react-router-dom';
import ApprovalPage from './components/ApprovalPage';
import ProtectedRoute from '../auth/ProtectedRoute';
export const approvalRoutes: RouteObject[] = [
  {
    path: '/approvals',
    element:( 
    <ProtectedRoute allowedRoles={["Admin"]}>
    <ApprovalPage/>
   </ProtectedRoute>
  ),
  }
];