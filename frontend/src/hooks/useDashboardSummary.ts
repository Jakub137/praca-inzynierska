import {
  ERROR_STATE,
  type LoadState,
  type SettledState,
  type UseAuthenticatedLoadResult,
  useAuthenticatedLoad,
} from "@/hooks/useAuthenticatedLoad";
import { getDashboardSummary } from "@/lib/api/dashboard";
import { readSessionToken } from "@/lib/auth/session";
import type { DashboardSummaryResponse } from "@/types/api";

type SummaryReady = {
  readonly status: "ready";
  readonly summary: DashboardSummaryResponse;
};

// "idle": the user is not authenticated yet (or anymore), so nothing is fetched or shown.
export type DashboardSummaryState = LoadState<SummaryReady>;

export type UseDashboardSummaryResult =
  UseAuthenticatedLoadResult<SummaryReady>;

// Any failure (401, 5xx, network, timeout) becomes "error": the API detail is never shown.
async function loadDashboardSummary(): Promise<SettledState<SummaryReady>> {
  const token = readSessionToken();
  if (token === undefined) {
    return ERROR_STATE;
  }
  try {
    const summary = await getDashboardSummary(token);
    return { status: "ready", summary };
  } catch {
    return ERROR_STATE;
  }
}

export function useDashboardSummary(): UseDashboardSummaryResult {
  return useAuthenticatedLoad(loadDashboardSummary);
}
