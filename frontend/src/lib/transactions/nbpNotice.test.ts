import { describe, expect, it } from "vitest";
import { buildAmountHint, STATIC_NBP_HINT } from "@/lib/transactions/nbpNotice";
import { EUR_RATE, TEST_RATES } from "@/test-utils/currencyRates";

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
