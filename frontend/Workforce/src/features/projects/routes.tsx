import type { RouteObject } from 'react-router-dom';
import ProjectsPage from './components/ProjectsPage';
import ProtectedRoute from '../auth/ProtectedRoute';
export const projectRoutes: RouteObject[] = [
  {
    path: '/projects', // no trailing slash
    element:(<ProtectedRoute allowedRoles={["Employee","Admin"]}> <ProjectsPage /></ProtectedRoute>),
  },
];