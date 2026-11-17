import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  SESSION_STARTED_EVENT,
  UNAUTHORIZED_EVENT,
  LOGIN_PATH,
} from "@/lib/auth/constants";
import type { AuthStatus } from "@/lib/auth/authContext";
import {
  restoreSession,
  type RestoredSession,
} from "@/lib/auth/restoreSession";
import { endSession, readSessionToken } from "@/lib/auth/session";
import { getTokenExpiryMs } from "@/lib/auth/token";
import type { AuthUserResponse } from "@/types/api";

type SessionState = {
  readonly status: AuthStatus;
  readonly user: AuthUserResponse | undefined;
  readonly expiresAtMs: number | undefined;
};

const LOADING_STATE: SessionState = {
  status: "loading",
  user: undefined,
  expiresAtMs: undefined,
};

const UNAUTHENTICATED_STATE: SessionState = {
  status: "unauthenticated",
  user: undefined,
  expiresAtMs: undefined,
};

const ERROR_STATE: SessionState = {
  status: "error",
  user: undefined,
  expiresAtMs: undefined,
};

function toAuthenticatedState(
  user: AuthUserResponse,
  expiresAtMs: number | undefined,
): SessionState {
  return { status: "authenticated", user, expiresAtMs };
}

function toSessionState(restored: RestoredSession): SessionState {
  switch (restored.kind) {
    case "authenticated":
      return toAuthenticatedState(restored.user, restored.expiresAtMs);
    case "unauthenticated":
      return UNAUTHENTICATED_STATE;
    case "error":
      return ERROR_STATE;
  }
}

export function useAuthSession() {
  const router = useRouter();
  const [state, setState] = useState<SessionState>(LOADING_STATE);

  const logout = useCallback(() => {
    endSession();
    setState(UNAUTHENTICATED_STATE);
    router.replace(LOGIN_PATH);
  }, [router]);

  // The cookie is read only after mount, so the first render matches the server markup.
  useEffect(() => {
    let isCancelled = false;
    void restoreSession().then((restored) => {
      if (!isCancelled) {
        setState(toSessionState(restored));
      }
    });
    return () => {
      isCancelled = true;
    };
  }, []);

  // Called from a button (e.g. the error Alert in T-064), never from an effect.
  const retry = useCallback(() => {
    setState(LOADING_STATE);
    void restoreSession().then((restored) =>
      setState(toSessionState(restored)),
    );
  }, []);

  useEffect(() => {
    function handleSessionStarted(event: Event) {
      const token = readSessionToken();
      const expiresAtMs =
        token === undefined ? undefined : getTokenExpiryMs(token);
      const { detail } = event as CustomEvent<AuthUserResponse>;
      setState(toAuthenticatedState(detail, expiresAtMs));
    }

    window.addEventListener(SESSION_STARTED_EVENT, handleSessionStarted);
    window.addEventListener(UNAUTHORIZED_EVENT, logout);
    return () => {
      window.removeEventListener(SESSION_STARTED_EVENT, handleSessionStarted);
      window.removeEventListener(UNAUTHORIZED_EVENT, logout);
    };
  }, [logout]);

  // Cleared on unmount and on every logout (expiresAtMs becomes undefined).
  useEffect(() => {
    if (state.expiresAtMs === undefined) {
      return;
    }
    const delayMs = Math.max(state.expiresAtMs - Date.now(), 0);
    const timerId = setTimeout(logout, delayMs);
    return () => clearTimeout(timerId);
  }, [state.expiresAtMs, logout]);

  return { status: state.status, user: state.user, logout, retry };
}
