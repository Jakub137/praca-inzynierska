import {
  ERROR_STATE,
  type LoadState,
  type SettledState,
  type UseAuthenticatedLoadResult,
  useAuthenticatedLoad,
} from "@/hooks/useAuthenticatedLoad";
import {
  getTransactions,
  type TransactionsPageParams,
} from "@/lib/api/transactions";
import { readSessionToken } from "@/lib/auth/session";
import type { TransactionFilters } from "@/lib/transactions/filters";
import { monthToDateRange } from "@/lib/transactions/months";
import type { PageResponse, TransactionResponse } from "@/types/api";

export const TRANSACTIONS_PAGE_SIZE = 15;

type PageReady = {
  readonly status: "ready";
  readonly page: PageResponse<TransactionResponse>;
};

// "idle": the user is not authenticated yet (or anymore), so nothing is fetched or shown.
export type TransactionsState = LoadState<PageReady>;

export type UseTransactionsResult = UseAuthenticatedLoadResult<PageReady>;

// The address bar counts pages from 1, the API from 0; unset filters are left out.
function toTransactionsParams(
  filters: TransactionFilters,
): TransactionsPageParams {
  const { page, month, type, categoryId } = filters;
  return {
    page: page - 1,
    size: TRANSACTIONS_PAGE_SIZE,
    ...(categoryId !== null && { categoryId }),
    ...(type !== null && { type }),
    ...(month !== null && monthToDateRange(month)),
  };
}

// Any failure (401, 5xx, network, timeout) becomes "error": the API detail is never shown.
async function loadTransactions(
  params: TransactionsPageParams,
): Promise<SettledState<PageReady>> {
  const token = readSessionToken();
  if (token === undefined) {
    return ERROR_STATE;
  }
  try {
    const page = await getTransactions(token, params);
    return { status: "ready", page };
  } catch {
    return ERROR_STATE;
  }
}

export function useTransactions(
  filters: TransactionFilters,
): UseTransactionsResult {
  const params = toTransactionsParams(filters);
  // The key is the request itself, so it changes exactly when the request does.
  return useAuthenticatedLoad(
    () => loadTransactions(params),
    JSON.stringify(params),
  );
}
