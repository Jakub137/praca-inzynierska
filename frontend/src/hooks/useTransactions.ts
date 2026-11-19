import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getTransactions,
  type TransactionsPageParams,
} from "@/lib/api/transactions";
import { readSessionToken } from "@/lib/auth/session";
import type { TransactionFilters } from "@/lib/transactions/filters";
import { monthToDateRange } from "@/lib/transactions/months";
import type { PageResponse, TransactionResponse } from "@/types/api";

export const TRANSACTIONS_PAGE_SIZE = 15;

type SettledState =
  | {
      readonly status: "ready";
      readonly page: PageResponse<TransactionResponse>;
    }
  | { readonly status: "error" };

type FetchState = { readonly status: "loading" } | SettledState;

// "idle": the user is not authenticated yet (or anymore), so nothing is fetched or shown.
export type TransactionsState = FetchState | { readonly status: "idle" };

export type UseTransactionsResult = {
  readonly state: TransactionsState;
  readonly retry: () => void;
};

// The result of one request, tagged with the key of the request that produced it.
type SettledRequest = {
  readonly key: string;
  readonly result: SettledState;
};

const LOADING_STATE: FetchState = { status: "loading" };
const ERROR_STATE: SettledState = { status: "error" };
const IDLE_STATE: TransactionsState = { status: "idle" };

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

function toRequestKey(attempt: number, filters: TransactionFilters): string {
  const { page, month, type, categoryId } = filters;
  return [attempt, page, month, type, categoryId].join("|");
}

// Any failure (401, 5xx, network, timeout) becomes "error": the API detail is never shown.
async function loadTransactions(
  filters: TransactionFilters,
): Promise<SettledState> {
  const token = readSessionToken();
  if (token === undefined) {
    return ERROR_STATE;
  }
  try {
    const page = await getTransactions(token, toTransactionsParams(filters));
    return { status: "ready", page };
  } catch {
    return ERROR_STATE;
  }
}

export function useTransactions(
  filters: TransactionFilters,
): UseTransactionsResult {
  const { status } = useAuth();
  const { page, month, type, categoryId } = filters;
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<SettledRequest | null>(null);
  const requestKey = toRequestKey(attempt, filters);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }
    const current = { page, month, type, categoryId };
    let isCancelled = false;
    void loadTransactions(current).then((result) => {
      if (!isCancelled) {
        setSettled({ key: toRequestKey(attempt, current), result });
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [status, attempt, page, month, type, categoryId]);

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  if (status !== "authenticated") {
    return { state: IDLE_STATE, retry };
  }
  // A result that belongs to older filters is not shown: the skeleton stays until the new request settles.
  const state: FetchState =
    settled !== null && settled.key === requestKey
      ? settled.result
      : LOADING_STATE;
  return { state, retry };
}
