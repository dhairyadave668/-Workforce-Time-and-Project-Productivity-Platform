// features/reports/routes.tsx
import type { RouteObject } from 'react-router-dom';
import ReportsPage from './components/ReportsPage';

export const reportsRoutes: RouteObject[] = [
  {
    path: 'reports',
    element: <ReportsPage />,
  },
];