import {
  ERROR_STATE,
  type LoadState,
  type SettledState,
  type UseAuthenticatedLoadResult,
  useAuthenticatedLoad,
} from "@/hooks/useAuthenticatedLoad";
import { getDashboardInsight } from "@/lib/api/ai";
import { readSessionToken } from "@/lib/auth/session";
import type { DashboardInsightResponse } from "@/types/api";

// What the banner needs: the three fields are always present together.
export type DashboardInsight = {
  readonly categoryId: number;
  readonly categoryName: string;
  readonly message: string;
};

type InsightReady = {
  readonly status: "ready";
  // null: no anomaly this month, so the banner is not shown.
  readonly insight: DashboardInsight | null;
};

// "idle": the user is not authenticated yet (or anymore), so nothing is fetched or shown.
export type DashboardInsightState = LoadState<InsightReady>;

export type UseDashboardInsightResult =
  UseAuthenticatedLoadResult<InsightReady>;

// The backend sets all six fields or none; a partly filled answer counts as "no insight".
function toInsight(
  response: DashboardInsightResponse,
): DashboardInsight | null {
  const { categoryId, categoryName, message } = response;
  if (categoryId === null || categoryName === null || message === null) {
    return null;
  }
  return { categoryId, categoryName, message };
}

// Any failure (401, 5xx, network, timeout) becomes "error": the API detail is never shown.
async function loadDashboardInsight(): Promise<SettledState<InsightReady>> {
  const token = readSessionToken();
  if (token === undefined) {
    return ERROR_STATE;
  }
  try {
    const response = await getDashboardInsight(token);
    return { status: "ready", insight: toInsight(response) };
  } catch {
    return ERROR_STATE;
  }
}

export function useDashboardInsight(): UseDashboardInsightResult {
  return useAuthenticatedLoad(loadDashboardInsight);
}
