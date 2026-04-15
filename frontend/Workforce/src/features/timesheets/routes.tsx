// routes.tsx
import type { RouteObject } from 'react-router-dom';
import DailyEntryForm from './components/TimesheetEntryForm';
import ProtectedRoute from '../auth/ProtectedRoute';

export const timesheetRoutes: RouteObject[] = [
  {
    path: '/timesheets',
    element: (
      <ProtectedRoute allowedRoles={["admin", "employee", "Admin", "Employee"]}> 
        <DailyEntryForm /> 
      </ProtectedRoute>
    ),
  }
];