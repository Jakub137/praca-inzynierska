const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

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
