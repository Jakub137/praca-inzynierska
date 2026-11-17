"use client";

import { useMemo, type ReactNode } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { AuthContext } from "@/lib/auth/authContext";

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const { status, user, logout, retry } = useAuthSession();
  const value = useMemo(
    () => ({ status, user, logout, retry }),
    [status, user, logout, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
