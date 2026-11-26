import {
  ERROR_STATE,
  type LoadState,
  type SettledState,
  type UseAuthenticatedLoadResult,
  useAuthenticatedLoad,
} from "@/hooks/useAuthenticatedLoad";
import { getMonthlyBalance } from "@/lib/api/analytics";
import { readSessionToken } from "@/lib/auth/session";
import type { MonthlyBalanceResponse } from "@/types/api";

type BalanceReady = {
  readonly status: "ready";
  readonly rows: readonly MonthlyBalanceResponse[];
};

export type MonthlyBalanceState = LoadState<BalanceReady>;

export type UseMonthlyBalanceResult = UseAuthenticatedLoadResult<BalanceReady>;

// Any failure (401, 5xx, network, timeout) becomes "error": the API detail is never shown.
async function loadMonthlyBalance(
  months: number,
): Promise<SettledState<BalanceReady>> {
  const token = readSessionToken();
  if (token === undefined) {
    return ERROR_STATE;
  }
  try {
    const rows = await getMonthlyBalance(token, months);
    return { status: "ready", rows };
  } catch {
    return ERROR_STATE;
  }
}

export function useMonthlyBalance(months: number): UseMonthlyBalanceResult {
  return useAuthenticatedLoad(() => loadMonthlyBalance(months), String(months));
}
