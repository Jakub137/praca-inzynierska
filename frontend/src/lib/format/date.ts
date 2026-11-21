const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// A calendar date has no time zone: it is built in UTC and formatted in UTC, so no zone shifts the day.
// The "pl-PL" month name is in the genitive ("15 lipca 2027").
const LONG_DATE_FORMAT = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

// A calendar date has no time zone, so it is rearranged as text:
// new Date("2026-11-17") is parsed as UTC and can show the previous day.
export function formatIsoDate(isoDate: string): string {
  const match = ISO_DATE_PATTERN.exec(isoDate);
  if (match === null) {
    return isoDate;
  }
  const [, year, month, day] = match;
  return `${day}.${month}.${year}`;
}

export function formatLongIsoDate(isoDate: string): string {
  const match = ISO_DATE_PATTERN.exec(isoDate);
  if (match === null) {
    return isoDate;
  }
  const [, year, month, day] = match;
  return LONG_DATE_FORMAT.format(
    new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))),
  );
}
