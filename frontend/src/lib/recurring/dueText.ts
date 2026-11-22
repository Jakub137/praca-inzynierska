const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

const DAY_PLURAL_RULES = new Intl.PluralRules("pl-PL");

// "1 dzień", but "2 dni", "5 dni", "22 dni": only the form for one differs.
const DAY_FORMS: Record<Intl.LDMLPluralRule, string> = {
  zero: "dni",
  one: "dzień",
  two: "dni",
  few: "dni",
  many: "dni",
  other: "dni",
};

export type DueInfo = {
  readonly text: string;
  readonly isOverdue: boolean;
};

// A calendar date has no time zone: the day number is taken from the text in UTC,
// never from new Date(iso), so the zone of the browser cannot shift it.
function toUtcDayNumber(isoDate: string): number | null {
  const match = ISO_DATE_PATTERN.exec(isoDate);
  if (match === null) {
    return null;
  }
  const [, year, month, day] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day)) / MS_PER_DAY;
}

function formatDays(count: number): string {
  return `${count} ${DAY_FORMS[DAY_PLURAL_RULES.select(count)]}`;
}

// "today" is the calendar day in the business zone (getTodayIso). A payment past its date stays on the
// list (T-062), so it gets "po terminie" in text, not only in color. Null for a text that is not a date.
export function buildDueInfo(
  nextDueDate: string,
  today: string,
): DueInfo | null {
  const due = toUtcDayNumber(nextDueDate);
  const now = toUtcDayNumber(today);
  if (due === null || now === null) {
    return null;
  }
  const days = due - now;
  if (days < 0) {
    return { text: `po terminie (${formatDays(-days)})`, isOverdue: true };
  }
  if (days === 0) {
    return { text: "dziś", isOverdue: false };
  }
  if (days === 1) {
    return { text: "jutro", isOverdue: false };
  }
  return { text: `za ${formatDays(days)}`, isOverdue: false };
}
