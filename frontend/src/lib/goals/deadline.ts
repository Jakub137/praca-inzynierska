import { formatLongIsoDate } from "@/lib/format/date";
import type { SavingsGoalResponse } from "@/types/api";

// The backend counts the deadline in calendar days of this zone (SavingsGoalDates.today).
const BUSINESS_TIME_ZONE = "Europe/Warsaw";

// "en-CA" writes RRRR-MM-DD, the same text as the API dates, so both compare as plain strings.
const TODAY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const MONTH_PLURAL_RULES = new Intl.PluralRules("pl-PL");

const MONTH_FORMS: Record<Intl.LDMLPluralRule, string> = {
  zero: "miesięcy",
  one: "miesiąc",
  two: "miesiące",
  few: "miesiące",
  many: "miesięcy",
  other: "miesięcy",
};

export function getTodayIso(now: Date): string {
  return TODAY_FORMAT.format(now);
}

export function formatMonthsCount(count: number): string {
  return `${count} ${MONTH_FORMS[MONTH_PLURAL_RULES.select(count)]}`;
}

// The API answers 0 months both for a deadline within a month and for a deadline that has passed:
// the two are told apart by comparing the dates (the text form RRRR-MM-DD sorts like the dates).
export function buildDeadlineText(
  goal: SavingsGoalResponse,
  today: string,
): string {
  const date = formatLongIsoDate(goal.targetDate);
  if (goal.status === "COMPLETED") {
    return date;
  }
  if (goal.monthsRemaining > 0) {
    return `${date} · ${formatMonthsCount(goal.monthsRemaining)} do terminu`;
  }
  if (goal.targetDate < today) {
    return `${date} · Termin minął`;
  }
  return `${date} · Termin w ciągu miesiąca`;
}
