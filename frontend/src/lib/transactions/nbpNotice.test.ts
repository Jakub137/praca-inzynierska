import { describe, expect, it } from "vitest";
import { buildAmountHint, STATIC_NBP_HINT } from "@/lib/transactions/nbpNotice";
import { EUR_RATE, TEST_RATES } from "@/test-utils/currencyRates";
import { EXPENSE_EUR, EXPENSE_PLN } from "@/test-utils/transactions";

const SERVER_NOTE = "Kwotę w PLN wyliczy serwer po kursie z dnia transakcji.";

describe("buildAmountHint", () => {
  it("shows nothing for PLN", () => {
    expect(buildAmountHint("100", "PLN", TEST_RATES)).toBeUndefined();
  });

  it.each(["", "abc", "0", "1,234"])(
    "shows only the rate when the amount is %j",
    (amount) => {
      expect(buildAmountHint(amount, "EUR", TEST_RATES)).toBe(
        `Kurs średni NBP z 17.11.2026: 4,3100. ${SERVER_NOTE}`,
      );
    },
  );

  it("shows the PLN estimate for a valid amount", () => {
    expect(buildAmountHint("100", "EUR", TEST_RATES)).toBe(
      `≈ 431,00 PLN wg kursu średniego NBP z 17.11.2026 (4,3100). ${SERVER_NOTE}`,
    );
  });

  it("accepts a comma and a dot as the decimal separator", () => {
    expect(buildAmountHint("50,0", "USD", TEST_RATES)).toBe(
      buildAmountHint("50.0", "USD", TEST_RATES),
    );
  });

  it("groups thousands with a non-breaking space, also in four digits", () => {
    expect(buildAmountHint("1000", "EUR", TEST_RATES)).toBe(
      `≈ 4 310,00 PLN wg kursu średniego NBP z 17.11.2026 (4,3100). ${SERVER_NOTE}`,
    );
    expect(buildAmountHint("10000", "EUR", TEST_RATES)).toBe(
      `≈ 43 100,00 PLN wg kursu średniego NBP z 17.11.2026 (4,3100). ${SERVER_NOTE}`,
    );
  });

  it.each([
    ["GBP", "5,1500"],
    ["CHF", "4,6200"],
  ] as const)("finds the rate of %s", (currency, rateText) => {
    expect(buildAmountHint("", currency, TEST_RATES)).toContain(
      `: ${rateText}.`,
    );
  });

  it("marks a fallback rate", () => {
    const rates = [{ ...EUR_RATE, source: "FALLBACK" as const }];

    expect(buildAmountHint("100", "EUR", rates)).toBe(
      `≈ 431,00 PLN wg kursu średniego NBP z 17.11.2026 (4,3100) (kurs zastępczy). ${SERVER_NOTE}`,
    );
    expect(buildAmountHint("", "EUR", rates)).toBe(
      `Kurs średni NBP z 17.11.2026: 4,3100 (kurs zastępczy). ${SERVER_NOTE}`,
    );
  });

  it("falls back to the static hint when the rate is not available", () => {
    expect(buildAmountHint("100", "EUR", [])).toBe(STATIC_NBP_HINT);
    expect(buildAmountHint("100", "USD", [EUR_RATE])).toBe(STATIC_NBP_HINT);
  });
});

describe("buildAmountHint in edit mode", () => {
  // EUR, rate 4.31, date 2026-11-12.
  const saved = EXPENSE_EUR;
  const sameKey = { saved, date: "2026-11-12" };

  it("keeps the saved rate when the currency and the date are unchanged", () => {
    expect(buildAmountHint("200", "EUR", TEST_RATES, sameKey)).toBe(
      "≈ 862,00 PLN po kursie z dnia transakcji (4,3100); kurs się nie zmieni.",
    );
  });

  it("shows only the saved rate when the amount is not valid", () => {
    expect(buildAmountHint("", "EUR", TEST_RATES, sameKey)).toBe(
      "Kurs z dnia transakcji: 4,3100; kurs się nie zmieni.",
    );
    expect(buildAmountHint("abc", "EUR", TEST_RATES, sameKey)).toBe(
      "Kurs z dnia transakcji: 4,3100; kurs się nie zmieni.",
    );
  });

  it("uses the saved rate, not the current one", () => {
    const edit = { saved: { ...saved, exchangeRate: 4.5 }, date: saved.date };

    expect(buildAmountHint("100", "EUR", TEST_RATES, edit)).toBe(
      "≈ 450,00 PLN po kursie z dnia transakcji (4,5000); kurs się nie zmieni.",
    );
  });

  it("does not need the current rates when the saved rate is kept", () => {
    expect(buildAmountHint("200", "EUR", [], sameKey)).toBe(
      "≈ 862,00 PLN po kursie z dnia transakcji (4,3100); kurs się nie zmieni.",
    );
  });

  it("falls back to the current rate notice when the date changes", () => {
    expect(
      buildAmountHint("100", "EUR", TEST_RATES, { saved, date: "2026-11-13" }),
    ).toBe(
      `≈ 431,00 PLN wg kursu średniego NBP z 17.11.2026 (4,3100). ${SERVER_NOTE}`,
    );
  });

  it("falls back to the current rate notice when the currency changes", () => {
    expect(buildAmountHint("100", "USD", TEST_RATES, sameKey)).toBe(
      `≈ 402,00 PLN wg kursu średniego NBP z 17.11.2026 (4,0200). ${SERVER_NOTE}`,
    );
  });

  it("shows nothing for PLN even when nothing changed", () => {
    const edit = { saved: EXPENSE_PLN, date: EXPENSE_PLN.date };

    expect(buildAmountHint("100", "PLN", TEST_RATES, edit)).toBeUndefined();
  });

  it("behaves as before without the edit argument", () => {
    expect(buildAmountHint("100", "EUR", TEST_RATES)).toBe(
      `≈ 431,00 PLN wg kursu średniego NBP z 17.11.2026 (4,3100). ${SERVER_NOTE}`,
    );
  });
});
