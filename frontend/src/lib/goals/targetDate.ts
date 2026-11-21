// The last allowed deadline: same as SavingsGoalDates.MAX_TARGET_DATE on the backend.
export const MAX_TARGET_DATE = "2100-12-31";

// The three messages below are copied 1:1 from the backend: SavingsGoalCommand
// (@NotNull on targetDate) and SavingsGoalDates.requireValidTargetDate.
export const TARGET_DATE_REQUIRED_MESSAGE = "Termin celu jest wymagany";
export const TARGET_DATE_NOT_FUTURE_MESSAGE =
  "Termin celu musi być w przyszłości. Wybierz datę późniejszą niż dzisiejsza.";
export const TARGET_DATE_TOO_LATE_MESSAGE =
  "Termin celu może przypadać najpóźniej 31.12.2100. Wybierz wcześniejszą datę.";

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
// A date input also accepts years above 9999 (up to six digits), which the backend rejects as too late.
const FORM_DATE_PATTERN = /^\d{4,6}-\d{2}-\d{2}$/;
// "275760-09-13" has 12 characters: padding makes the text order equal to the calendar order.
const SORTABLE_DATE_LENGTH = 12;

function toSortable(isoDate: string): string {
  return isoDate.padStart(SORTABLE_DATE_LENGTH, "0");
}

// "today" is the calendar day in the business zone (getTodayIso); the next day is computed on the text
// in UTC, so the zone of the browser never shifts it (toLocalIsoDate would).
export function getTomorrowIso(today: string): string {
  const match = ISO_DATE_PATTERN.exec(today);
  if (match === null) {
    return today;
  }
  const [, year, month, day] = match;
  const tomorrow = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day) + 1),
  );
  return tomorrow.toISOString().slice(0, 10);
}

// The min and max attributes of the date input do not stop a date typed with the keyboard,
// so the same rules as on the backend are checked here as well.
export function validateTargetDate(raw: string, today: string): string | null {
  if (!FORM_DATE_PATTERN.test(raw)) {
    return TARGET_DATE_REQUIRED_MESSAGE;
  }
  const date = toSortable(raw);
  if (date <= toSortable(today)) {
    return TARGET_DATE_NOT_FUTURE_MESSAGE;
  }
  if (date > toSortable(MAX_TARGET_DATE)) {
    return TARGET_DATE_TOO_LATE_MESSAGE;
  }
  return null;
}
