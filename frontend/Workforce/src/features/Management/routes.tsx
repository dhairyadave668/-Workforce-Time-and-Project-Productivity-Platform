import type{ RouteObject } from 'react-router-dom';
import UserManagement from './Users/Usersmanager';
import ProtectedRoute from '../auth/ProtectedRoute';
export const managerRoutes: RouteObject[] = [
  {
    path: '/usermanager',
    element:( 
    <ProtectedRoute allowedRoles={["Admin"]}>
    <UserManagement/>
    </ProtectedRoute>
  ),
  }
];