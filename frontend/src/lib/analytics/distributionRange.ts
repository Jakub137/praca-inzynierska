export type DateRange = {
  // "RRRR-MM-DD", both inclusive.
  readonly dateFrom: string;
  readonly dateTo: string;
};

// For dates built with Date.UTC only: the UTC text keeps the calendar day.
function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// The same window as monthly-balance?months=N: whole months, the current one included.
export function buildDistributionRange(
  today: string,
  months: number,
): DateRange {
  const [year, month] = today.split("-").map(Number);
  // Date.UTC takes a month index outside 0-11 and moves the year; day 0 is the last day of the month before.
  return {
    dateFrom: toIsoDate(new Date(Date.UTC(year, month - months, 1))),
    dateTo: toIsoDate(new Date(Date.UTC(year, month, 0))),
  };
}
