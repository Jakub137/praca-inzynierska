import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

// The "ready" shape is chosen by each hook, e.g. { status: "ready", goals, today }.
export type ReadyState = { readonly status: "ready" };

export type ErrorState = { readonly status: "error" };

// What a loader resolves to: its own "ready" shape or the shared error (never the API detail).
export type SettledState<T extends ReadyState> = T | ErrorState;

// "idle": the user is not authenticated yet (or anymore), so nothing is fetched or shown.
export type LoadState<T extends ReadyState> =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | SettledState<T>;

export type UseAuthenticatedLoadResult<T extends ReadyState> = {
  readonly state: LoadState<T>;
  readonly retry: () => void;
};

export const ERROR_STATE: ErrorState = { status: "error" };

// The result of one request, tagged with the attempt that produced it.
type SettledRequest<T extends ReadyState> = {
  readonly attempt: number;
  readonly result: SettledState<T>;
};

const LOADING_STATE = { status: "loading" } as const;
const IDLE_STATE = { status: "idle" } as const;

// load: a module-level function that reads the token and calls the API.
// Only the first load is kept and it is not a dependency of the effect: a re-render, even with a
// new function, never starts a request; only signing in and retry() do.
export function useAuthenticatedLoad<T extends ReadyState>(
  load: () => Promise<SettledState<T>>,
): UseAuthenticatedLoadResult<T> {
  const { status } = useAuth();
  const [initialLoad] = useState(() => load);
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<SettledRequest<T> | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }
    let isCancelled = false;
    void initialLoad().then((result) => {
      if (!isCancelled) {
        setSettled({ attempt, result });
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [status, attempt, initialLoad]);

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  if (status !== "authenticated") {
    return { state: IDLE_STATE, retry };
  }
  // A result of an older attempt is not shown: the skeleton stays until the new request settles.
  const state: LoadState<T> =
    settled !== null && settled.attempt === attempt
      ? settled.result
      : LOADING_STATE;
  return { state, retry };
}
