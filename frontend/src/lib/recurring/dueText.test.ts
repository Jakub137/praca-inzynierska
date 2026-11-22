import { describe, expect, it } from "vitest";
import { buildDueInfo } from "@/lib/recurring/dueText";

const TODAY = "2026-11-21";

describe("buildDueInfo", () => {
  it.each([
    ["2026-11-21", "dziś"],
    ["2026-11-22", "jutro"],
    ["2026-11-23", "za 2 dni"],
    ["2026-11-30", "za 9 dni"],
    ["2026-12-13", "za 22 dni"],
    ["2027-01-01", "za 41 dni"],
  ])("tells %s from today as %j and not overdue", (due, text) => {
    expect(buildDueInfo(due, TODAY)).toEqual({ text, isOverdue: false });
  });

  it.each([
    ["2026-11-20", "po terminie (1 dzień)"],
    ["2026-11-18", "po terminie (3 dni)"],
    ["2026-10-30", "po terminie (22 dni)"],
  ])("tells %s from today as %j and overdue", (due, text) => {
    expect(buildDueInfo(due, TODAY)).toEqual({ text, isOverdue: true });
  });

  it("counts the leap day", () => {
    expect(buildDueInfo("2028-03-01", "2028-02-28")?.text).toBe("za 2 dni");
  });

  it("counts a day in a non-leap year", () => {
    expect(buildDueInfo("2027-03-01", "2027-02-28")?.text).toBe("jutro");
  });

  it("returns null when the due date is not a calendar date", () => {
    expect(buildDueInfo("", TODAY)).toBeNull();
  });

  it("returns null when today is not a calendar date", () => {
    expect(buildDueInfo("2026-11-21", "dziś")).toBeNull();
  });
});
