import { RouteObject } from 'react-router-dom';
import { LoginForm } from './components/LoginForm';

export const authRoutes: RouteObject[] = [
  {
    path: '/login',
    element: <LoginForm />, // This component was created in the previous step
  },
  {
    path: '/register',
    element: <div>Register Page</div>, 
  }
];
