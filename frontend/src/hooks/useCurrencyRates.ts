import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getCurrencyRates } from "@/lib/api/currency";
import { readSessionToken } from "@/lib/auth/session";
import type { CurrencyRateResponse } from "@/types/api";

type FetchState =
  | { readonly status: "loading" }
  | {
      readonly status: "ready";
      readonly rates: readonly CurrencyRateResponse[];
    }
  | { readonly status: "error" };

// "idle": the user is not authenticated yet (or anymore), so nothing is fetched or shown.
export type CurrencyRatesState = FetchState | { readonly status: "idle" };

const LOADING_STATE: FetchState = { status: "loading" };
const ERROR_STATE: FetchState = { status: "error" };
const IDLE_STATE: CurrencyRatesState = { status: "idle" };

// Any failure (503, network, timeout) becomes "error": the API detail is never shown.
async function loadRates(): Promise<FetchState> {
  const token = readSessionToken();
  if (token === undefined) {
    return ERROR_STATE;
  }
  try {
    const { rates } = await getCurrencyRates(token);
    return rates.length === 0 ? ERROR_STATE : { status: "ready", rates };
  } catch {
    return ERROR_STATE;
  }
}

// One request after login, no refresh: NBP publishes once a day and the backend caches it.
export function useCurrencyRates(): CurrencyRatesState {
  const { status } = useAuth();
  const [state, setState] = useState<FetchState>(LOADING_STATE);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }
    let isCancelled = false;
    void loadRates().then((next) => {
      if (!isCancelled) {
        setState(next);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [status]);

  return status === "authenticated" ? state : IDLE_STATE;
}
