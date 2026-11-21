import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getSavingsGoals } from "@/lib/api/goals";
import { readSessionToken } from "@/lib/auth/session";
import { getTodayIso } from "@/lib/goals/deadline";
import type { SavingsGoalResponse } from "@/types/api";

type SettledState =
  | {
      readonly status: "ready";
      readonly goals: readonly SavingsGoalResponse[];
      // Calendar day (RRRR-MM-DD, business time zone) read when the goals arrived.
      readonly today: string;
    }
  | { readonly status: "error" };

type FetchState = { readonly status: "loading" } | SettledState;

// "idle": the user is not authenticated yet (or anymore), so nothing is fetched or shown.
export type SavingsGoalsState = FetchState | { readonly status: "idle" };

export type UseSavingsGoalsResult = {
  readonly state: SavingsGoalsState;
  readonly retry: () => void;
};

// The result of one request, tagged with the attempt that produced it.
type SettledRequest = {
  readonly attempt: number;
  readonly result: SettledState;
};

const LOADING_STATE: FetchState = { status: "loading" };
const ERROR_STATE: SettledState = { status: "error" };
const IDLE_STATE: SavingsGoalsState = { status: "idle" };

// Any failure (401, 5xx, network, timeout) becomes "error": the API detail is never shown.
// The clock is read here, once per request, so that rendering stays pure.
async function loadSavingsGoals(): Promise<SettledState> {
  const token = readSessionToken();
  if (token === undefined) {
    return ERROR_STATE;
  }
  try {
    const goals = await getSavingsGoals(token);
    return { status: "ready", goals, today: getTodayIso(new Date()) };
  } catch {
    return ERROR_STATE;
  }
}

export function useSavingsGoals(): UseSavingsGoalsResult {
  const { status } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<SettledRequest | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }
    let isCancelled = false;
    void loadSavingsGoals().then((result) => {
      if (!isCancelled) {
        setSettled({ attempt, result });
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [status, attempt]);

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  if (status !== "authenticated") {
    return { state: IDLE_STATE, retry };
  }
  // A result of an older attempt is not shown: the skeleton stays until the new request settles.
  const state: FetchState =
    settled !== null && settled.attempt === attempt
      ? settled.result
      : LOADING_STATE;
  return { state, retry };
}
