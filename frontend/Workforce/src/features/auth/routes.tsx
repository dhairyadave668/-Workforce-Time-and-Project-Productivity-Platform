// src/features/auth/routes.tsx
import type { RouteObject } from "react-router-dom";
import Login from "./components/Pages/LoginForm";
import Dashboard from "../../shared/Pages/dashboard/Dashboard";
import ProtectedRoute from "./ProtectedRoute";

export const authRoutes: RouteObject[] = [
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
];