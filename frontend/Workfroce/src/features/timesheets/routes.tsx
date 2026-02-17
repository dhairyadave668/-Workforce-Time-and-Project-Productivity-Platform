import { RouteObject } from 'react-router-dom';
import { DailyEntryForm } from './components/DailyEntryForm';

export const timesheetRoutes: RouteObject[] = [
  {
    path: '/timesheets',
    element: <DailyEntryForm />,
  },
  {
    path: '/timesheets/history',
    element: <div>History Page</div>,
  }
];
