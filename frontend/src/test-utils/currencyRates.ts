import type { CurrencyRateResponse } from "@/types/api";

export const PUBLICATION_DATE = "2026-11-17";

export const EUR_RATE: CurrencyRateResponse = {
  currency: "EUR",
  rate: 4.31,
  effectiveDate: PUBLICATION_DATE,
  source: "NBP",
};

export const TEST_RATES: readonly CurrencyRateResponse[] = [
  EUR_RATE,
  {
    currency: "USD",
    rate: 4.02,
    effectiveDate: PUBLICATION_DATE,
    source: "NBP",
  },
  {
    currency: "GBP",
    rate: 5.15,
    effectiveDate: PUBLICATION_DATE,
    source: "NBP",
  },
  {
    currency: "CHF",
    rate: 4.62,
    effectiveDate: PUBLICATION_DATE,
    source: "NBP",
  },
];
