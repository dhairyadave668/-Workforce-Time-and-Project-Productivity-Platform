import { RouteObject } from 'react-router-dom';

export const projectRoutes: RouteObject[] = [
  {
    path: '/projects',
    element: <div>Projects List</div>,
  },
  {
    path: '/projects/create',
    element: <div>Create Project</div>,
  }
];
