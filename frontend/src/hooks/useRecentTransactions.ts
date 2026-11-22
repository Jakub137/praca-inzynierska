import {
  ERROR_STATE,
  type LoadState,
  type SettledState,
  type UseAuthenticatedLoadResult,
  useAuthenticatedLoad,
} from "@/hooks/useAuthenticatedLoad";
import { getTransactions } from "@/lib/api/transactions";
import { readSessionToken } from "@/lib/auth/session";
import type { PageResponse, TransactionResponse } from "@/types/api";

export const RECENT_TRANSACTIONS_COUNT = 5;

type RecentReady = {
  readonly status: "ready";
  readonly page: PageResponse<TransactionResponse>;
};

// "idle": the user is not authenticated yet (or anymore), so nothing is fetched or shown.
export type RecentTransactionsState = LoadState<RecentReady>;

export type UseRecentTransactionsResult =
  UseAuthenticatedLoadResult<RecentReady>;

// Any failure (401, 5xx, network, timeout) becomes "error": the API detail is never shown.
// No sorting parameter: the backend answers with the newest transactions first.
async function loadRecentTransactions(): Promise<SettledState<RecentReady>> {
  const token = readSessionToken();
  if (token === undefined) {
    return ERROR_STATE;
  }
  try {
    const page = await getTransactions(token, {
      page: 0,
      size: RECENT_TRANSACTIONS_COUNT,
    });
    return { status: "ready", page };
  } catch {
    return ERROR_STATE;
  }
}

export function useRecentTransactions(): UseRecentTransactionsResult {
  return useAuthenticatedLoad(loadRecentTransactions);
}
