import {
  ERROR_STATE,
  type LoadState,
  type SettledState,
  type UseAuthenticatedLoadResult,
  useAuthenticatedLoad,
} from "@/hooks/useAuthenticatedLoad";
import { getRecurringPayments } from "@/lib/api/recurringPayments";
import { readSessionToken } from "@/lib/auth/session";
import { getTodayIso } from "@/lib/goals/deadline";
import type { RecurringPaymentResponse } from "@/types/api";

type PaymentsReady = {
  readonly status: "ready";
  readonly payments: readonly RecurringPaymentResponse[];
  // Calendar day (RRRR-MM-DD, business time zone) read when the payments arrived.
  readonly today: string;
};

// "idle": the user is not authenticated yet (or anymore), so nothing is fetched or shown.
export type RecurringPaymentsState = LoadState<PaymentsReady>;

export type UseRecurringPaymentsResult =
  UseAuthenticatedLoadResult<PaymentsReady>;

// Any failure (401, 5xx, network, timeout) becomes "error": the API detail is never shown.
// The clock is read here, once per request, so that rendering stays pure.
async function loadRecurringPayments(): Promise<SettledState<PaymentsReady>> {
  const token = readSessionToken();
  if (token === undefined) {
    return ERROR_STATE;
  }
  try {
    const payments = await getRecurringPayments(token);
    return { status: "ready", payments, today: getTodayIso(new Date()) };
  } catch {
    return ERROR_STATE;
  }
}

export function useRecurringPayments(): UseRecurringPaymentsResult {
  return useAuthenticatedLoad(loadRecurringPayments);
}
