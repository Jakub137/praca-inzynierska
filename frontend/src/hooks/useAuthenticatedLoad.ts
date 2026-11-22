import { useCallback, useEffect, useRef, useState } from "react";
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

// The result of one request, tagged with the attempt and the key of the request that produced it.
type SettledRequest<T extends ReadyState> = {
  readonly attempt: number;
  readonly requestKey: string;
  readonly result: SettledState<T>;
};

const LOADING_STATE = { status: "loading" } as const;
const IDLE_STATE = { status: "idle" } as const;

// Hooks without parameters (goals, payments, dashboard) keep this key for good.
const NO_REQUEST_KEY = "";

// load: a function that reads the token and calls the API. It may use the parameters of the
// render that produced requestKey (month, filters).
// requestKey: those parameters as text. A new key starts a new request and shows the skeleton;
// a re-render with the same key, even with a new load function, never does. Signing in and
// retry() start a request too.
export function useAuthenticatedLoad<T extends ReadyState>(
  load: () => Promise<SettledState<T>>,
  requestKey: string = NO_REQUEST_KEY,
): UseAuthenticatedLoadResult<T> {
  const { status } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<SettledRequest<T> | null>(null);
  const latestLoad = useRef(load);

  // Declared before the request effect, so the request below starts with the load of this render.
  useEffect(() => {
    latestLoad.current = load;
  });

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }
    let isCancelled = false;
    void latestLoad.current().then((result) => {
      if (!isCancelled) {
        setSettled({ attempt, requestKey, result });
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [status, attempt, requestKey]);

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  if (status !== "authenticated") {
    return { state: IDLE_STATE, retry };
  }
  // A result of an older attempt or key is not shown: the skeleton stays until the new request settles.
  const state: LoadState<T> =
    settled !== null &&
    settled.attempt === attempt &&
    settled.requestKey === requestKey
      ? settled.result
      : LOADING_STATE;
  return { state, retry };
}
