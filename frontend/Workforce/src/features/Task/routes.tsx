import type{ RouteObject } from 'react-router-dom';
import TasksPage from './components/TasksPage';
import ProtectedRoute from '../auth/ProtectedRoute';

export const taskRoutes: RouteObject[] = [
  {
   path: '/Tasks',
    element:(<ProtectedRoute  allowedRoles={["Employee","Admin"]}><TasksPage/></ProtectedRoute>      
  ),
  }
];