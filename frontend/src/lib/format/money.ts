import type { SupportedCurrency, TransactionType } from "@/types/api";

// "always": pl-PL skips the thousands separator for four-digit numbers by default.
const AMOUNT_FORMAT = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: "always",
});

// "unit" instead of "percent": the API already returns 76.00, and "percent" would multiply it by 100.
// "trunc": 99.6 must read 99%, so a WARNING limit never shows 100%.
const PERCENT_FORMAT = new Intl.NumberFormat("pl-PL", {
  style: "unit",
  unit: "percent",
  maximumFractionDigits: 0,
  roundingMode: "trunc",
});

const SIGNS: Record<TransactionType, string> = {
  INCOME: "+",
  EXPENSE: "-",
};

function formatAmount(value: number): string {
  return AMOUNT_FORMAT.format(value);
}

export function formatPln(value: number): string {
  return `${formatAmount(value)} zł`;
}

export function formatPercent(value: number): string {
  return PERCENT_FORMAT.format(value);
}

export function formatForeignAmount(
  value: number,
  currency: SupportedCurrency,
): string {
  return `${formatAmount(value)} ${currency}`;
}

// The sign comes from the transaction type, not from the sign of the number.
export function formatSignedPln(value: number, type: TransactionType): string {
  return `${SIGNS[type]}${formatPln(Math.abs(value))}`;
}
