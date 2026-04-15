// src/features/user/hooks/useCurrentUser.ts
import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUser } from "../api/userApi";
import type { User } from "../types/userTypes";

export const useCurrentUser = () => {
  return useQuery<User, Error>({
    queryKey: ["me"],
    queryFn: fetchCurrentUser,
    retry: false,
  });
};