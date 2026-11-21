import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getBudgetUsage } from "@/lib/api/budgets";
import { readSessionToken } from "@/lib/auth/session";
import { monthToBudgetPeriod } from "@/lib/budgets/period";
import type { BudgetUsageResponse } from "@/types/api";

type SettledState =
  | {
      readonly status: "ready";
      readonly usage: readonly BudgetUsageResponse[];
    }
  | { readonly status: "error" };

type FetchState = { readonly status: "loading" } | SettledState;

// "idle": the user is not authenticated yet (or anymore), so nothing is fetched or shown.
export type BudgetUsageState = FetchState | { readonly status: "idle" };

export type UseBudgetUsageResult = {
  readonly state: BudgetUsageState;
  readonly retry: () => void;
};

// The result of one request, tagged with the key of the request that produced it.
type SettledRequest = {
  readonly key: string;
  readonly result: SettledState;
};

const LOADING_STATE: FetchState = { status: "loading" };
const ERROR_STATE: SettledState = { status: "error" };
const IDLE_STATE: BudgetUsageState = { status: "idle" };

function toRequestKey(attempt: number, month: string | null): string {
  return `${attempt}|${month}`;
}

// Any failure (401, 5xx, network, timeout) becomes "error": the API detail is never shown.
async function loadBudgetUsage(month: string | null): Promise<SettledState> {
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
  const { status } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<SettledRequest | null>(null);
  const requestKey = toRequestKey(attempt, month);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }
    let isCancelled = false;
    void loadBudgetUsage(month).then((result) => {
      if (!isCancelled) {
        setSettled({ key: toRequestKey(attempt, month), result });
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [status, attempt, month]);

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  if (status !== "authenticated") {
    return { state: IDLE_STATE, retry };
  }
  // A result that belongs to an older month is not shown: the skeleton stays until the new request settles.
  const state: FetchState =
    settled !== null && settled.key === requestKey
      ? settled.result
      : LOADING_STATE;
  return { state, retry };
}
