export type MonthOption = {
  // "RRRR-MM", the value kept in the address bar.
  readonly value: string;
  readonly label: string;
};

export type DateRange = {
  readonly dateFrom: string;
  readonly dateTo: string;
};

export const MONTH_OPTIONS_COUNT = 12;

const MONTH_LABEL_FORMAT = new Intl.DateTimeFormat("pl-PL", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function padTwo(value: number): string {
  return String(value).padStart(2, "0");
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase("pl-PL") + text.slice(1);
}

// "now" is a parameter: the caller decides what the current month is, so tests do not depend on the run date.
export function buildMonthOptions(now: Date): readonly MonthOption[] {
  return Array.from({ length: MONTH_OPTIONS_COUNT }, (_, offset) => {
    // Date.UTC rolls a negative month index back into the previous year.
    const firstDay = new Date(
      Date.UTC(now.getFullYear(), now.getMonth() - offset, 1),
    );
    const month = padTwo(firstDay.getUTCMonth() + 1);
    return {
      value: `${firstDay.getUTCFullYear()}-${month}`,
      label: capitalize(MONTH_LABEL_FORMAT.format(firstDay)),
    };
  });
}

export function monthToDateRange(month: string): DateRange {
  const [year, monthNumber] = month.split("-").map(Number);
  // Day 0 of the next month is the last day of this one; UTC avoids time zone shifts.
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { dateFrom: `${month}-01`, dateTo: `${month}-${padTwo(lastDay)}` };
}

// "RRRR-MM" to "listopad 2026": nominative case and lower case, for use inside a sentence.
export function formatMonthName(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return MONTH_LABEL_FORMAT.format(
    new Date(Date.UTC(year, monthNumber - 1, 1)),
  );
}
