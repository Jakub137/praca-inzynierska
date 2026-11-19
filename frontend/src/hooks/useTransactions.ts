import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getTransactions } from "@/lib/api/transactions";
import { readSessionToken } from "@/lib/auth/session";
import type { PageResponse, TransactionResponse } from "@/types/api";

export const TRANSACTIONS_PAGE_SIZE = 15;
const FIRST_PAGE = 0;

type FetchState =
  | { readonly status: "loading" }
  | {
      readonly status: "ready";
      readonly page: PageResponse<TransactionResponse>;
    }
  | { readonly status: "error" };

// "idle": the user is not authenticated yet (or anymore), so nothing is fetched or shown.
export type TransactionsState = FetchState | { readonly status: "idle" };

export type UseTransactionsResult = {
  readonly state: TransactionsState;
  readonly retry: () => void;
};

const LOADING_STATE: FetchState = { status: "loading" };
const ERROR_STATE: FetchState = { status: "error" };
const IDLE_STATE: TransactionsState = { status: "idle" };

// Any failure (401, 5xx, network, timeout) becomes "error": the API detail is never shown.
async function loadTransactions(): Promise<FetchState> {
  const token = readSessionToken();
  if (token === undefined) {
    return ERROR_STATE;
  }
  try {
    const page = await getTransactions(token, {
      page: FIRST_PAGE,
      size: TRANSACTIONS_PAGE_SIZE,
    });
    return { status: "ready", page };
  } catch {
    return ERROR_STATE;
  }
}

export function useTransactions(): UseTransactionsResult {
  const { status } = useAuth();
  const [state, setState] = useState<FetchState>(LOADING_STATE);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }
    let isCancelled = false;
    void loadTransactions().then((next) => {
      if (!isCancelled) {
        setState(next);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [status, attempt]);

  const retry = useCallback(() => {
    setState(LOADING_STATE);
    setAttempt((current) => current + 1);
  }, []);

  return {
    state: status === "authenticated" ? state : IDLE_STATE,
    retry,
  };
}
