import { describe, expect, it } from "vitest";
import {
  formatForeignAmount,
  formatPercent,
  formatPln,
  formatSignedPercent,
  formatSignedPln,
} from "@/lib/format/money";

const NBSP = "\u00a0";

describe("formatPln", () => {
  it("uses a comma and two decimal places", () => {
    expect(formatPln(184.5)).toBe("184,50 zł");
  });

  it("groups four-digit numbers with a non-breaking space", () => {
    expect(formatPln(1500)).toBe(`1${NBSP}500,00 zł`);
  });
});

describe("formatForeignAmount", () => {
  it("shows the currency code after the amount", () => {
    expect(formatForeignAmount(100, "EUR")).toBe("100,00 EUR");
  });
});

describe("formatSignedPln", () => {
  it("adds a plus for an income", () => {
    expect(formatSignedPln(7500, "INCOME")).toBe(`+7${NBSP}500,00 zł`);
  });

  it("adds a minus for an expense", () => {
    expect(formatSignedPln(184.5, "EXPENSE")).toBe("-184,50 zł");
  });

  it("takes the sign from the type, not from the number", () => {
    expect(formatSignedPln(-184.5, "EXPENSE")).toBe("-184,50 zł");
    expect(formatSignedPln(-7500, "INCOME")).toBe(`+7${NBSP}500,00 zł`);
  });
});

describe("formatPercent", () => {
  it.each([
    [76, "76%"],
    [99.6, "99%"],
    [99.99, "99%"],
    [100, "100%"],
    [0.4, "0%"],
    [184.2, "184%"],
  ])("shows %s as %s (truncated, no rounding up)", (value, expected) => {
    expect(formatPercent(value)).toBe(expected);
  });
});

describe("formatSignedPercent", () => {
  it.each([
    [12.5, "+12,5%"],
    [-3.4, "-3,4%"],
    [0, "0,0%"],
    [100, "+100,0%"],
  ])("shows %s as %s (one decimal place, explicit sign)", (value, expected) => {
    expect(formatSignedPercent(value)).toBe(expected);
  });
});
