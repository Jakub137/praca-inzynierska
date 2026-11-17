import {
  SESSION_STARTED_EVENT,
  UNAUTHORIZED_EVENT,
} from "@/lib/auth/constants";
import type { AuthUserResponse } from "@/types/api";

export function notifyUnauthorized(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
}

export function notifySessionStarted(user: AuthUserResponse): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<AuthUserResponse>(SESSION_STARTED_EVENT, { detail: user }),
  );
}
