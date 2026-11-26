const ANALYTICS_PATH = "/analytics";

// Every period fits the "months" range of the monthly balance endpoint (1-12).
export const ANALYTICS_PERIODS = [
  { months: 3, label: "Ostatnie 3 miesiące" },
  { months: 6, label: "Ostatnie 6 miesięcy" },
  { months: 12, label: "Ostatnie 12 miesięcy" },
] as const;

export type AnalyticsMonths = (typeof ANALYTICS_PERIODS)[number]["months"];

export const DEFAULT_ANALYTICS_MONTHS: AnalyticsMonths = 6;

// Only an exact value from the list is accepted; anything else in the address means the default period.
export function parseAnalyticsMonths(
  value: string | string[] | undefined,
): AnalyticsMonths {
  const period = ANALYTICS_PERIODS.find(
    (option) => String(option.months) === value,
  );
  return period?.months ?? DEFAULT_ANALYTICS_MONTHS;
}

// The default period is left out, so the plain page keeps the address "/analytics".
export function buildAnalyticsHref(months: AnalyticsMonths): string {
  return months === DEFAULT_ANALYTICS_MONTHS
    ? ANALYTICS_PATH
    : `${ANALYTICS_PATH}?months=${months}`;
}
