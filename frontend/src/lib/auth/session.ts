import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { notifySessionStarted } from "@/lib/auth/events";
import type { AuthResponse } from "@/types/api";

export function buildSessionCookie(
  value: string,
  maxAgeSeconds: number | undefined,
  secure: boolean,
): string {
  const attributes = ["Path=/", "SameSite=Lax"];
  if (maxAgeSeconds !== undefined) {
    attributes.push(`Max-Age=${maxAgeSeconds}`);
  }
  if (secure) {
    attributes.push("Secure");
  }
  return `${SESSION_COOKIE_NAME}=${value}; ${attributes.join("; ")}`;
}

// Deliberately not httpOnly: the browser client reads the token for the Bearer header
// and proxy.ts reads it for redirects (ADR, otwarte.md pkt 6). Never log the token.
// rememberMe -> Max-Age = expiresIn; otherwise a session cookie (no Max-Age).
export function startSession(auth: AuthResponse, rememberMe: boolean): void {
  const maxAgeSeconds = rememberMe ? auth.expiresIn : undefined;
  document.cookie = buildSessionCookie(
    auth.accessToken,
    maxAgeSeconds,
    location.protocol === "https:",
  );
  notifySessionStarted(auth.user);
}

// Same Path as in startSession, otherwise the browser would keep the original cookie.
export function endSession(): void {
  document.cookie = buildSessionCookie("", 0, location.protocol === "https:");
}

export function readSessionToken(): string | undefined {
  const prefix = `${SESSION_COOKIE_NAME}=`;
  const entry = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(prefix));
  const value = entry?.slice(prefix.length);
  return value ? value : undefined;
}
