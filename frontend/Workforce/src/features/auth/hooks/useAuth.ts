// src/features/auth/hooks/useAuth.ts
import { useContext } from "react";
import { AuthContext,  } from "./context";

import type { AuthContextType } from "../hooks/context";
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};
