// src/features/auth/hooks/context.ts
import { createContext } from "react";

export type AuthContextType = {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  userRole: string | null;
  userDisplayName: string | null;
  name: string | null;
  email: string | null;
  entraId: string | null;
  isAuthReady: boolean;
};

export const AuthContext = createContext<AuthContextType | null>(null);