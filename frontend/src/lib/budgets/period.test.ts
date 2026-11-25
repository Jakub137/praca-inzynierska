import { describe, expect, it } from "vitest";
import { buildBudgetsHref, monthToBudgetPeriod } from "@/lib/budgets/period";

describe("monthToBudgetPeriod", () => {
  it.each([
    ["2026-11", { year: 2026, month: 11 }],
    ["2026-01", { year: 2026, month: 1 }],
    ["2025-12", { year: 2025, month: 12 }],
  ])("turns %s into the API parameters", (month, expected) => {
    expect(monthToBudgetPeriod(month)).toEqual(expected);
  });
});

describe("buildBudgetsHref", () => {
  it("keeps the plain address for the current month", () => {
    expect(buildBudgetsHref(null)).toBe("/budgets");
  });

  it("puts the month into the query string", () => {
    expect(buildBudgetsHref("2026-10")).toBe("/budgets?month=2026-10");
  });

  it("puts the category to edit into the query string", () => {
    expect(buildBudgetsHref(null, 2)).toBe("/budgets?edit=2");
  });

  it("keeps the month next to the category to edit", () => {
    expect(buildBudgetsHref("2026-10", 2)).toBe(
      "/budgets?month=2026-10&edit=2",
    );
  });

  it("leaves out the category to edit when it is null", () => {
    expect(buildBudgetsHref("2026-10", null)).toBe("/budgets?month=2026-10");
  });
});
