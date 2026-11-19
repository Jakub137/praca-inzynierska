import {
  formatRate,
  formatRateDate,
  PANEL_FRACTION_DIGITS,
} from "@/lib/format/currencyRate";
import { formatForeignAmount } from "@/lib/format/money";
import { parseAmountOrNull } from "@/lib/transactions/transactionForm";
import type { CurrencyRateResponse, SupportedCurrency } from "@/types/api";

const BASE_CURRENCY: SupportedCurrency = "PLN";

export const STATIC_NBP_HINT =
  "Przeliczenie po bieżącym kursie NBP dla walut obcych";
const SERVER_NOTE = "Kwotę w PLN wyliczy serwer po kursie z dnia transakcji.";

function getFallbackSuffix(rate: CurrencyRateResponse): string {
  return rate.source === "FALLBACK" ? " (kurs zastępczy)" : "";
}

// Text under the amount field. The product is a preview only and is never sent:
// the server converts at the rate of the transaction date, so it may differ.
export function buildAmountHint(
  amountText: string,
  currency: SupportedCurrency,
  rates: readonly CurrencyRateResponse[],
): string | undefined {
  if (currency === BASE_CURRENCY) {
    return undefined;
  }
  const rate = rates.find((candidate) => candidate.currency === currency);
  if (rate === undefined) {
    return STATIC_NBP_HINT;
  }
  const date = formatRateDate(rate.effectiveDate);
  const rateText = formatRate(rate.rate, PANEL_FRACTION_DIGITS);
  const suffix = getFallbackSuffix(rate);
  const amount = parseAmountOrNull(amountText);
  if (amount === null) {
    return `Kurs średni NBP z ${date}: ${rateText}${suffix}. ${SERVER_NOTE}`;
  }
  // The amount formatter of the table: thousands separator also in four-digit numbers.
  const estimate = formatForeignAmount(amount * rate.rate, BASE_CURRENCY);
  return `≈ ${estimate} wg kursu średniego NBP z ${date} (${rateText})${suffix}. ${SERVER_NOTE}`;
}
