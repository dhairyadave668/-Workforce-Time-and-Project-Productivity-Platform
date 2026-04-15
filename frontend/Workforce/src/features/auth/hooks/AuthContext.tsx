// src/features/auth/hooks/AuthContext.tsx
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { AuthContext,  } from "./context";

import type { AuthContextType } from "../hooks/context";
import api from "../utils/axios";

interface User {
  id: string;
  entraId: string;
  name: string;
  email: string;
  role: string;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsAuthReady(true);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post("/api/auth/login", { email, password });
    const { token, ...userData } = response.data;
    localStorage.setItem("accessToken", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setToken(token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const contextValue: AuthContextType = {
    login,
    logout,
    isAuthenticated: !!token,
    userRole: user?.role || null,
    userDisplayName: user?.name || null,
    name: user?.name || null,
    email: user?.email || null,
    entraId: user?.entraId || null,
    isAuthReady,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};