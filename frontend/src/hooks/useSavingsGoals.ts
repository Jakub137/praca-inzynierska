import {
  ERROR_STATE,
  type LoadState,
  type SettledState,
  type UseAuthenticatedLoadResult,
  useAuthenticatedLoad,
} from "@/hooks/useAuthenticatedLoad";
import { getSavingsGoals } from "@/lib/api/goals";
import { readSessionToken } from "@/lib/auth/session";
import { getTodayIso } from "@/lib/goals/deadline";
import type { SavingsGoalResponse } from "@/types/api";

type GoalsReady = {
  readonly status: "ready";
  readonly goals: readonly SavingsGoalResponse[];
  // Calendar day (RRRR-MM-DD, business time zone) read when the goals arrived.
  readonly today: string;
};

// "idle": the user is not authenticated yet (or anymore), so nothing is fetched or shown.
export type SavingsGoalsState = LoadState<GoalsReady>;

export type UseSavingsGoalsResult = UseAuthenticatedLoadResult<GoalsReady>;

// Any failure (401, 5xx, network, timeout) becomes "error": the API detail is never shown.
// The clock is read here, once per request, so that rendering stays pure.
async function loadSavingsGoals(): Promise<SettledState<GoalsReady>> {
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
  return useAuthenticatedLoad(loadSavingsGoals);
}
