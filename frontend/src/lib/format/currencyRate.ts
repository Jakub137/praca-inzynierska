import type { CurrencyRateResponse } from "@/types/api";

export const PILL_FRACTION_DIGITS = 2;
export const PANEL_FRACTION_DIGITS = 4;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatRate(rate: number, fractionDigits: number): string {
  return new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(rate);
}

// effectiveDate is a calendar date without a time zone. It is rearranged as text:
// new Date("2026-11-17") is parsed as UTC and can show the previous day.
export function formatRateDate(isoDate: string): string {
  const match = ISO_DATE_PATTERN.exec(isoDate);
  if (match === null) {
    return isoDate;
  }
  const [, year, month, day] = match;
  return `${day}.${month}.${year}`;
}

export function formatRatePublication(rate: CurrencyRateResponse): string {
  const text = `Kurs średni NBP z ${formatRateDate(rate.effectiveDate)}`;
  return rate.source === "FALLBACK" ? `${text} · kurs zastępczy` : text;
}
