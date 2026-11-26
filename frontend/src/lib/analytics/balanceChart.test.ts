import { describe, expect, it } from "vitest";
import {
  buildChartLabel,
  formatAxisAmount,
  formatShortMonth,
  hasNoAmounts,
} from "@/lib/analytics/balanceChart";
import { EMPTY_BALANCE, TEST_BALANCE } from "@/test-utils/monthlyBalance";

describe("formatAxisAmount", () => {
  it.each([
    [0, "0 zł"],
    [800, "800 zł"],
    [1500, "1,5 tys. zł"],
    [2250, "2,25 tys. zł"],
    [10000, "10 tys. zł"],
    [1000000, "1 mln zł"],
  ])("shortens %d", (value, expected) => {
    expect(formatAxisAmount(value)).toBe(expected);
  });
});

describe("formatShortMonth", () => {
  it.each([
    ["2026-01", "sty"],
    ["2026-11", "lis"],
  ])("shows %s as %s", (month, expected) => {
    expect(formatShortMonth(month)).toBe(expected);
  });
});

describe("hasNoAmounts", () => {
  it("is true when every month is zero", () => {
    expect(hasNoAmounts(EMPTY_BALANCE)).toBe(true);
  });

  it("is false when a month has only an income", () => {
    const rows = [{ month: "2026-11", income: 0.01, expenses: 0 }];

    expect(hasNoAmounts(rows)).toBe(false);
  });

  it("is false when a month has only an expense", () => {
    const rows = [{ month: "2026-11", income: 0, expenses: 0.01 }];

    expect(hasNoAmounts(rows)).toBe(false);
  });
});

describe("buildChartLabel", () => {
  it("names the chart with the first and the last month", () => {
    expect(buildChartLabel(TEST_BALANCE)).toBe(
      "Przychody i wydatki, okres: wrzesień 2026 – listopad 2026. Strzałki w lewo i w prawo wybierają miesiąc.",
    );
  });
});
