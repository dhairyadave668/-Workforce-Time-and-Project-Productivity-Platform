import { createBrowserRouter, Navigate } from 'react-router-dom';
import { authRoutes } from '../features/auth/routes';
import { timesheetRoutes } from '../features/timesheets/routes';
import { projectRoutes } from '../features/projects/routes';
import { managerRoutes } from '../features/Management/routes';
import { taskRoutes} from '../features/Task/routes';
import { reportsRoutes } from '../features/reports/routes'; 
import  {approvalRoutes} from '../features/Approvals/routes';
import NotFoundPage  from "../shared/Pages/NotFoundPage"
import {auditlogRoutes} from '@/features/AuditLog/routes';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />, 
  },
  
  // --- Spread the feature routes here ---
  
  ...projectRoutes,
  ...managerRoutes,
  ...authRoutes,
  ...timesheetRoutes,
  ...taskRoutes,
  ...approvalRoutes,
  ...reportsRoutes,
  ...auditlogRoutes,
  
  // Fallback 404
  {
    path: '*',
    element: <NotFoundPage/>,
  }
]);