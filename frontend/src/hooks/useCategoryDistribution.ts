import {
  ERROR_STATE,
  type LoadState,
  type SettledState,
  type UseAuthenticatedLoadResult,
  useAuthenticatedLoad,
} from "@/hooks/useAuthenticatedLoad";
import { buildDistributionRange } from "@/lib/analytics/distributionRange";
import { getCategoryDistribution } from "@/lib/api/analytics";
import { readSessionToken } from "@/lib/auth/session";
import { getTodayIso } from "@/lib/goals/deadline";
import type { CategoryDistributionResponse } from "@/types/api";

type DistributionReady = {
  readonly status: "ready";
  readonly distribution: CategoryDistributionResponse;
};

export type CategoryDistributionState = LoadState<DistributionReady>;

export type UseCategoryDistributionResult =
  UseAuthenticatedLoadResult<DistributionReady>;

// Any failure (401, 5xx, network, timeout) becomes "error": the API detail is never shown.
async function loadCategoryDistribution(
  months: number,
): Promise<SettledState<DistributionReady>> {
  const token = readSessionToken();
  if (token === undefined) {
    return ERROR_STATE;
  }
  try {
    // "Today" is the day in the business zone, like the month window of the balance chart.
    const range = buildDistributionRange(getTodayIso(new Date()), months);
    const distribution = await getCategoryDistribution(token, range);
    return { status: "ready", distribution };
  } catch {
    return ERROR_STATE;
  }
}

export function useCategoryDistribution(
  months: number,
): UseCategoryDistributionResult {
  return useAuthenticatedLoad(
    () => loadCategoryDistribution(months),
    String(months),
  );
}
