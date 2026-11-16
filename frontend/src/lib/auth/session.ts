import type { AuthResponse } from "@/types/api";

// TODO(T-028): replace with the real session start. Cookie without Max-Age when
// rememberMe is false, Max-Age = auth.expiresIn when true. Never log the token.
export function startSession(auth: AuthResponse, rememberMe: boolean): void {
  void auth;
  void rememberMe;
}
