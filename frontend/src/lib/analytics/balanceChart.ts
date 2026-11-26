import { formatMonthName } from "@/lib/transactions/months";
import type { MonthlyBalanceResponse } from "@/types/api";

// Without the fraction options a tick such as 2250 would be rounded to "2,3 tys. zł".
const AXIS_AMOUNT_FORMAT = new Intl.NumberFormat("pl-PL", {
  notation: "compact",
  style: "currency",
  currency: "PLN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const SHORT_MONTH_FORMAT = new Intl.DateTimeFormat("pl-PL", {
  month: "short",
  timeZone: "UTC",
});

export function formatAxisAmount(value: number): string {
  return AXIS_AMOUNT_FORMAT.format(value);
}

// "2026-11" to "lis": the year is shown in the tooltip, the table and the chart name.
export function formatShortMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return SHORT_MONTH_FORMAT.format(
    new Date(Date.UTC(year, monthNumber - 1, 1)),
  );
}

// The API always returns every month, so "no data" means that all amounts are zero.
export function hasNoAmounts(rows: readonly MonthlyBalanceResponse[]): boolean {
  return rows.every((row) => row.income === 0 && row.expenses === 0);
}

// Accessible name of the chart; expects at least one month.
export function buildChartLabel(
  rows: readonly MonthlyBalanceResponse[],
): string {
  const first = formatMonthName(rows[0].month);
  const last = formatMonthName(rows[rows.length - 1].month);
  return `Przychody i wydatki, okres: ${first} – ${last}. Strzałki w lewo i w prawo wybierają miesiąc.`;
}
