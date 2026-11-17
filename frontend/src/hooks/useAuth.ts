import { useContext } from "react";
import { AuthContext, type AuthContextValue } from "@/lib/auth/authContext";

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
