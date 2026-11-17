import { getCurrentUser } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import { endSession, readSessionToken } from "@/lib/auth/session";
import { getTokenExpiryMs } from "@/lib/auth/token";
import type { AuthUserResponse } from "@/types/api";

export type RestoredSession =
  | {
      readonly kind: "authenticated";
      readonly user: AuthUserResponse;
      readonly expiresAtMs: number;
    }
  | { readonly kind: "unauthenticated" }
  | { readonly kind: "error" };

const HTTP_UNAUTHORIZED = 401;
const UNAUTHENTICATED: RestoredSession = { kind: "unauthenticated" };
const RESTORE_ERROR: RestoredSession = { kind: "error" };

// Async on purpose: every branch resolves in a microtask, so callers never set state
// synchronously inside an effect.
export async function restoreSession(): Promise<RestoredSession> {
  const token = readSessionToken();
  if (token === undefined) {
    return UNAUTHENTICATED;
  }
  const expiresAtMs = getTokenExpiryMs(token);
  if (expiresAtMs === undefined || expiresAtMs <= Date.now()) {
    endSession();
    return UNAUTHENTICATED;
  }
  try {
    const user = await getCurrentUser(token);
    return { kind: "authenticated", user, expiresAtMs };
  } catch (error) {
    // A 401 is handled globally (cookie removed, redirect to /login). Any other failure
    // (network, 5xx) keeps the cookie and reports "error": the token may still be valid,
    // so treating it as "logged out" would fight with proxy.ts (redirect loop).
    if (error instanceof ApiError && error.status === HTTP_UNAUTHORIZED) {
      return UNAUTHENTICATED;
    }
    return RESTORE_ERROR;
  }
}
