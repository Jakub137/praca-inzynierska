import {
  formatRate,
  formatRateDate,
  PANEL_FRACTION_DIGITS,
} from "@/lib/format/currencyRate";
import { formatForeignAmount } from "@/lib/format/money";
import { parseAmountOrNull } from "@/lib/transactions/transactionForm";
import type {
  CurrencyRateResponse,
  SupportedCurrency,
  TransactionResponse,
} from "@/types/api";

const BASE_CURRENCY: SupportedCurrency = "PLN";

export const STATIC_NBP_HINT =
  "Przeliczenie po bieżącym kursie NBP dla walut obcych";
const SERVER_NOTE = "Kwotę w PLN wyliczy serwer po kursie z dnia transakcji.";

// What the server keeps when an edit changes neither the currency nor the date.
export type SavedTransaction = Pick<
  TransactionResponse,
  "currency" | "date" | "exchangeRate"
>;

export type AmountHintEdit = {
  readonly saved: SavedTransaction;
  // The date currently chosen in the form.
  readonly date: string;
};

function getFallbackSuffix(rate: CurrencyRateResponse): string {
  return rate.source === "FALLBACK" ? " (kurs zastępczy)" : "";
}

// The server fetches a new rate only when the currency or the date changes (UpdateTransactionUseCase).
function keepsSavedRate(
  currency: SupportedCurrency,
  edit: AmountHintEdit | undefined,
): edit is AmountHintEdit {
  return (
    edit !== undefined &&
    edit.saved.currency === currency &&
    edit.saved.date === edit.date
  );
}

function buildSavedRateHint(
  amountText: string,
  saved: SavedTransaction,
): string {
  const rateText = formatRate(saved.exchangeRate, PANEL_FRACTION_DIGITS);
  const amount = parseAmountOrNull(amountText);
  if (amount === null) {
    return `Kurs z dnia transakcji: ${rateText}; kurs się nie zmieni.`;
  }
  const estimate = formatForeignAmount(
    amount * saved.exchangeRate,
    BASE_CURRENCY,
  );
  return `≈ ${estimate} po kursie z dnia transakcji (${rateText}); kurs się nie zmieni.`;
}

// Text under the amount field. The product is a preview only and is never sent:
// the server converts at the rate of the transaction date, so it may differ.
// In edit mode (`edit` given) an unchanged currency and date keep the saved rate.
export function buildAmountHint(
  amountText: string,
  currency: SupportedCurrency,
  rates: readonly CurrencyRateResponse[],
  edit?: AmountHintEdit,
): string | undefined {
  if (currency === BASE_CURRENCY) {
    return undefined;
  }
  if (keepsSavedRate(currency, edit)) {
    return buildSavedRateHint(amountText, edit.saved);
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
