import { describe, expect, it } from "vitest";
import {
  buildDeadlineText,
  formatMonthsCount,
  getTodayIso,
} from "@/lib/goals/deadline";
import {
  ACTIVE_GOAL,
  COMPLETED_GOAL,
  DUE_SOON_GOAL,
  OVERDUE_GOAL,
  TEST_TODAY,
} from "@/test-utils/goals";

describe("getTodayIso", () => {
  it("returns the calendar day in the business time zone", () => {
    expect(getTodayIso(new Date("2026-11-21T10:00:00Z"))).toBe("2026-11-21");
  });

  it("moves to the next day after local midnight in winter (UTC+1)", () => {
    expect(getTodayIso(new Date("2026-11-20T23:30:00Z"))).toBe("2026-11-21");
  });

  it("moves to the next day after local midnight in summer (UTC+2)", () => {
    expect(getTodayIso(new Date("2026-07-15T22:30:00Z"))).toBe("2026-07-16");
  });
});

describe("formatMonthsCount", () => {
  it.each([
    { count: 1, expected: "1 miesiąc" },
    { count: 2, expected: "2 miesiące" },
    { count: 4, expected: "4 miesiące" },
    { count: 5, expected: "5 miesięcy" },
    { count: 12, expected: "12 miesięcy" },
    { count: 21, expected: "21 miesięcy" },
    { count: 22, expected: "22 miesiące" },
    { count: 25, expected: "25 miesięcy" },
  ])("writes $expected", ({ count, expected }) => {
    expect(formatMonthsCount(count)).toBe(expected);
  });
});

describe("buildDeadlineText", () => {
  it("shows the date and the months to the deadline", () => {
    expect(buildDeadlineText(ACTIVE_GOAL, TEST_TODAY)).toBe(
      "21 lipca 2027 · 8 miesięcy do terminu",
    );
  });

  it("says the deadline passed when 0 months remain and the date is before today", () => {
    expect(buildDeadlineText(OVERDUE_GOAL, TEST_TODAY)).toBe(
      "1 października 2026 · Termin minął",
    );
  });

  it("says the deadline is within a month when 0 months remain and the date is ahead", () => {
    expect(buildDeadlineText(DUE_SOON_GOAL, TEST_TODAY)).toBe(
      "10 grudnia 2026 · Termin w ciągu miesiąca",
    );
  });

  it("does not treat a deadline that is today as passed", () => {
    expect(buildDeadlineText(DUE_SOON_GOAL, "2026-12-10")).toBe(
      "10 grudnia 2026 · Termin w ciągu miesiąca",
    );
  });

  it("shows only the date for a completed goal", () => {
    expect(buildDeadlineText(COMPLETED_GOAL, TEST_TODAY)).toBe(
      "31 grudnia 2027",
    );
  });
});
