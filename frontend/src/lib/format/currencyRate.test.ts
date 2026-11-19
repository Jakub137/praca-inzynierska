import { describe, expect, it } from "vitest";
import {
  formatRate,
  formatRateDate,
  formatRatePublication,
} from "@/lib/format/currencyRate";
import { EUR_RATE } from "@/test-utils/currencyRates";

describe("formatRate", () => {
  it("uses a decimal comma and the requested number of places", () => {
    expect(formatRate(4.31, 2)).toBe("4,31");
    expect(formatRate(4.31, 4)).toBe("4,3100");
  });

  it("rounds to the requested number of places", () => {
    expect(formatRate(4.3079, 2)).toBe("4,31");
  });
});

describe("formatRateDate", () => {
  it("formats a calendar date as DD.MM.YYYY", () => {
    expect(formatRateDate("2026-11-17")).toBe("17.11.2026");
  });

  it("does not shift the day across a year boundary", () => {
    expect(formatRateDate("2026-01-01")).toBe("01.01.2026");
  });

  it("returns unexpected input unchanged", () => {
    expect(formatRateDate("17 listopada")).toBe("17 listopada");
  });
});

describe("formatRatePublication", () => {
  it("describes a live NBP rate", () => {
    expect(formatRatePublication(EUR_RATE)).toBe(
      "Kurs średni NBP z 17.11.2026",
    );
  });

  it("adds the fallback label for a fallback rate", () => {
    const fallbackRate = { ...EUR_RATE, source: "FALLBACK" as const };

    expect(formatRatePublication(fallbackRate)).toBe(
      "Kurs średni NBP z 17.11.2026 · kurs zastępczy",
    );
  });
});
