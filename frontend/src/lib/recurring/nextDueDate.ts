// The last allowed date: same as RecurringPaymentDates.MAX_NEXT_DUE_DATE on the backend.
export const MAX_NEXT_DUE_DATE = "2100-12-31";

// The three messages below are copied 1:1 from the backend: RecurringPaymentCommand
// (@NotNull on nextDueDate) and RecurringPaymentDates.requireValidNextDueDate.
export const NEXT_DUE_DATE_REQUIRED_MESSAGE =
  "Termin następnej płatności jest wymagany";
export const NEXT_DUE_DATE_PAST_MESSAGE =
  "Termin następnej płatności nie może być w przeszłości. Wybierz dzisiejszą lub późniejszą datę.";
export const NEXT_DUE_DATE_TOO_LATE_MESSAGE =
  "Termin następnej płatności może przypadać najpóźniej 31.12.2100. Wybierz wcześniejszą datę.";

// A date input also accepts years above 9999 (up to six digits), which the backend rejects as too late.
const FORM_DATE_PATTERN = /^\d{4,6}-\d{2}-\d{2}$/;
// "275760-09-13" has 12 characters: padding makes the text order equal to the calendar order.
const SORTABLE_DATE_LENGTH = 12;

function toSortable(isoDate: string): string {
  return isoDate.padStart(SORTABLE_DATE_LENGTH, "0");
}

// "today" is the calendar day in the business zone (getTodayIso). Unlike a goal deadline, today is allowed:
// a payment may fall due today. The min and max attributes of the date input do not stop a date typed
// with the keyboard, so the same rules as on the backend are checked here as well.
export function validateNextDueDate(raw: string, today: string): string | null {
  if (!FORM_DATE_PATTERN.test(raw)) {
    return NEXT_DUE_DATE_REQUIRED_MESSAGE;
  }
  const date = toSortable(raw);
  if (date < toSortable(today)) {
    return NEXT_DUE_DATE_PAST_MESSAGE;
  }
  if (date > toSortable(MAX_NEXT_DUE_DATE)) {
    return NEXT_DUE_DATE_TOO_LATE_MESSAGE;
  }
  return null;
}
