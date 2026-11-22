import {
  ERROR_STATE,
  type LoadState,
  type SettledState,
  type UseAuthenticatedLoadResult,
  useAuthenticatedLoad,
} from "@/hooks/useAuthenticatedLoad";
import { getBudgetUsage } from "@/lib/api/budgets";
import { readSessionToken } from "@/lib/auth/session";
import { monthToBudgetPeriod } from "@/lib/budgets/period";
import type { BudgetUsageResponse } from "@/types/api";

type UsageReady = {
  readonly status: "ready";
  readonly usage: readonly BudgetUsageResponse[];
};

// "idle": the user is not authenticated yet (or anymore), so nothing is fetched or shown.
export type BudgetUsageState = LoadState<UsageReady>;

export type UseBudgetUsageResult = UseAuthenticatedLoadResult<UsageReady>;

// The backend picks the current month when no month is sent.
const CURRENT_MONTH_KEY = "current";

// Any failure (401, 5xx, network, timeout) becomes "error": the API detail is never shown.
async function loadBudgetUsage(
  month: string | null,
): Promise<SettledState<UsageReady>> {
  const token = readSessionToken();
  if (token === undefined) {
    return ERROR_STATE;
  }
  try {
    const usage = await getBudgetUsage(
      token,
      month === null ? undefined : monthToBudgetPeriod(month),
    );
    return { status: "ready", usage };
  } catch {
    return ERROR_STATE;
  }
}

// month: "RRRR-MM", or null for the current month (the backend picks it).
export function useBudgetUsage(month: string | null): UseBudgetUsageResult {
  return useAuthenticatedLoad(
    () => loadBudgetUsage(month),
    month ?? CURRENT_MONTH_KEY,
  );
}
