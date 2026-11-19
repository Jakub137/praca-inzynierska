import { apiRequest } from "@/lib/api/client";
import type { CurrencyRatesResponse } from "@/types/api";

// /currency/rates is protected: it needs the Bearer token.
export function getCurrencyRates(
  token: string,
): Promise<CurrencyRatesResponse> {
  return apiRequest<CurrencyRatesResponse>("/currency/rates", { token });
}
