import { createBrowserRouter, Navigate } from 'react-router-dom';
import { authRoutes } from '../features/auth/routes';
import { timesheetRoutes } from '../features/timesheets/routes';
import { projectRoutes } from '../features/projects/routes';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />, // Default redirect
  },
  
  // --- Spread the feature routes here ---
  ...authRoutes,
  ...timesheetRoutes,
  ...projectRoutes,

  // Fallback 404
  {
    path: '*',
    element: <div>404 - Not Found</div>,
  }
]);
