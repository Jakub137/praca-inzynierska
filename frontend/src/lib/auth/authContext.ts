import { createContext } from "react";
import type { AuthUserResponse } from "@/types/api";

// "error": GET /auth/me failed for a reason other than 401 and the cookie was kept.
// Pages must not redirect on any status (proxy.ts and the global 401 do that);
// on "error" they show an Alert with a retry button.
export type AuthStatus =
  "loading" | "authenticated" | "unauthenticated" | "error";

export type AuthContextValue = {
  readonly status: AuthStatus;
  readonly user: AuthUserResponse | undefined;
  readonly logout: () => void;
  readonly retry: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
