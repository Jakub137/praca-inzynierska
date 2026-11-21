import { describe, expect, it } from "vitest";
import { getTodayIso } from "@/lib/goals/deadline";
import {
  getTomorrowIso,
  MAX_TARGET_DATE,
  validateTargetDate,
} from "@/lib/goals/targetDate";

const TODAY = "2026-11-21";
// Copied from SavingsGoalCommand and SavingsGoalDates (backend), so a typo here fails the test.
const REQUIRED = "Termin celu jest wymagany";
const NOT_FUTURE =
  "Termin celu musi być w przyszłości. Wybierz datę późniejszą niż dzisiejsza.";
const TOO_LATE =
  "Termin celu może przypadać najpóźniej 31.12.2100. Wybierz wcześniejszą datę.";

describe("getTomorrowIso", () => {
  it.each([
    ["2026-11-21", "2026-11-22"],
    ["2026-11-30", "2026-12-01"],
    ["2026-12-31", "2027-01-01"],
    ["2028-02-28", "2028-02-29"],
    ["2027-02-28", "2027-03-01"],
  ])("moves %s to %s", (today, expected) => {
    expect(getTomorrowIso(today)).toBe(expected);
  });

  it("leaves a text that is not a calendar date unchanged", () => {
    expect(getTomorrowIso("")).toBe("");
  });

  // Warsaw is UTC+1 in November and UTC+2 in July: near midnight the business day is ahead of UTC.
  it.each([
    ["2026-11-21T22:30:00Z", "2026-11-22"],
    ["2026-11-21T23:30:00Z", "2026-11-23"],
    ["2026-07-01T21:30:00Z", "2026-07-02"],
    ["2026-07-01T22:30:00Z", "2026-07-03"],
  ])("gives the day after the Warsaw day of %s: %s", (instant, expected) => {
    expect(getTomorrowIso(getTodayIso(new Date(instant)))).toBe(expected);
  });
});

describe("validateTargetDate", () => {
  it("exports the last allowed deadline", () => {
    expect(MAX_TARGET_DATE).toBe("2100-12-31");
  });

  it.each([
    ["", REQUIRED],
    ["2026-11", REQUIRED],
    ["2026-11-20", NOT_FUTURE],
    [TODAY, NOT_FUTURE],
    ["0001-01-01", NOT_FUTURE],
    ["2101-01-01", TOO_LATE],
    ["275760-09-13", TOO_LATE],
    ["100000-01-01", TOO_LATE],
  ])("rejects %j with its message", (raw, message) => {
    expect(validateTargetDate(raw, TODAY)).toBe(message);
  });

  it.each(["2026-11-22", "2027-07-21", "2100-12-31"])("accepts %s", (raw) => {
    expect(validateTargetDate(raw, TODAY)).toBeNull();
  });
});
