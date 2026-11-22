import { describe, expect, it } from "vitest";
import { formatPaymentAmount } from "@/lib/recurring/amount";

// formatPln groups thousands with a non-breaking space; an escape survives copying the plan.
const NBSP = " ";

describe("formatPaymentAmount", () => {
  it("formats a PLN amount with zł", () => {
    expect(formatPaymentAmount(43, "PLN")).toBe("43,00 zł");
  });

  it("formats a PLN amount with a comma and two decimals", () => {
    expect(formatPaymentAmount(850, "PLN")).toBe("850,00 zł");
  });

  it("groups thousands of a PLN amount with a non-breaking space", () => {
    expect(formatPaymentAmount(1250.5, "PLN")).toBe(`1${NBSP}250,50 zł`);
  });

  it("formats a foreign amount with the currency code", () => {
    expect(formatPaymentAmount(9.99, "EUR")).toBe("9,99 EUR");
  });

  it("groups thousands of a foreign amount", () => {
    expect(formatPaymentAmount(1000, "USD")).toBe(`1${NBSP}000,00 USD`);
  });
});
