import { describe, expect, it } from "vitest";
import {
  AMOUNT_INPUT_MAX_LENGTH,
  createEmptyFormValues,
  getSelectedType,
  parseCurrency,
  parseTransactionForm,
  toLocalIsoDate,
  type TransactionFormValues,
} from "@/lib/transactions/transactionForm";
import { TEST_CATEGORIES } from "@/test-utils/categories";

const VALID_VALUES: TransactionFormValues = {
  amount: "184,50",
  currency: "PLN",
  description: "Zakupy w Biedronce",
  categoryId: "1",
  date: "2026-11-19",
};

function errorsOf(overrides: Partial<TransactionFormValues>) {
  const result = parseTransactionForm(
    { ...VALID_VALUES, ...overrides },
    TEST_CATEGORIES,
  );
  return result.status === "invalid" ? result.errors : {};
}

describe("toLocalIsoDate", () => {
  it("formats the local calendar date with leading zeros", () => {
    expect(toLocalIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toLocalIsoDate(new Date(2026, 10, 19))).toBe("2026-11-19");
  });

  it("keeps the local date shortly after local midnight", () => {
    expect(toLocalIsoDate(new Date(2026, 0, 1, 0, 30))).toBe("2026-01-01");
  });
});

describe("createEmptyFormValues", () => {
  it("starts with PLN, no category and the given date", () => {
    expect(createEmptyFormValues("2026-11-19")).toEqual({
      amount: "",
      currency: "PLN",
      description: "",
      categoryId: "",
      date: "2026-11-19",
    });
  });
});

describe("parseCurrency", () => {
  it("accepts every supported currency and rejects anything else", () => {
    expect(["PLN", "EUR", "USD", "GBP", "CHF"].map(parseCurrency)).toEqual([
      "PLN",
      "EUR",
      "USD",
      "GBP",
      "CHF",
    ]);
    expect(parseCurrency("JPY")).toBeNull();
    expect(parseCurrency("")).toBeNull();
  });
});

describe("getSelectedType", () => {
  it("takes the type from the category", () => {
    expect(getSelectedType("1", TEST_CATEGORIES)).toBe("EXPENSE");
    expect(getSelectedType("9", TEST_CATEGORIES)).toBe("INCOME");
  });

  it("falls back to an expense when no category is chosen", () => {
    expect(getSelectedType("", TEST_CATEGORIES)).toBe("EXPENSE");
  });
});

describe("parseTransactionForm", () => {
  it("builds the request from valid values", () => {
    expect(parseTransactionForm(VALID_VALUES, TEST_CATEGORIES)).toEqual({
      status: "valid",
      request: {
        amount: 184.5,
        currency: "PLN",
        categoryId: 1,
        date: "2026-11-19",
        description: "Zakupy w Biedronce",
        type: "EXPENSE",
      },
    });
  });

  it("takes the type of the request from the category", () => {
    const result = parseTransactionForm(
      { ...VALID_VALUES, categoryId: "9" },
      TEST_CATEGORIES,
    );

    expect(result.status === "valid" && result.request.type).toBe("INCOME");
  });

  it("trims the description", () => {
    const result = parseTransactionForm(
      { ...VALID_VALUES, description: "  Kawa  " },
      TEST_CATEGORIES,
    );

    expect(result.status === "valid" && result.request.description).toBe(
      "Kawa",
    );
  });

  it.each([
    ["184,50", 184.5],
    ["184.50", 184.5],
    ["184", 184],
    ["0,01", 0.01],
    ["  12,5 ", 12.5],
    ["9999999999,99", 9999999999.99],
  ])("accepts the amount %s", (amount, expected) => {
    const result = parseTransactionForm(
      { ...VALID_VALUES, amount },
      TEST_CATEGORIES,
    );

    expect(result.status === "valid" && result.request.amount).toBe(expected);
  });

  it.each(["abc", "184.", ".5", "1,234", "12345678901", "-5", "1 500,00"])(
    "rejects the amount %s with the format hint",
    (amount) => {
      expect(errorsOf({ amount }).amount).toContain(
        "Wpisz kwotę w formacie 184,50",
      );
    },
  );

  it.each(["0", "0,00", "0.0"])("rejects the zero amount %s", (amount) => {
    expect(errorsOf({ amount }).amount).toBe("Kwota musi być większa od zera.");
  });

  it("asks for the amount when it is blank", () => {
    expect(errorsOf({ amount: "  " }).amount).toBe("Podaj kwotę.");
  });

  it("limits the amount field to the longest valid amount", () => {
    expect(AMOUNT_INPUT_MAX_LENGTH).toBe("9999999999,99".length);
  });

  it("asks for a description and rejects a blank one", () => {
    expect(errorsOf({ description: "" }).description).toBe(
      "Podaj opis transakcji.",
    );
    expect(errorsOf({ description: "   " }).description).toBe(
      "Podaj opis transakcji.",
    );
  });

  it("accepts 100 characters and rejects 101", () => {
    expect(errorsOf({ description: "a".repeat(100) }).description).toBe(
      undefined,
    );
    expect(errorsOf({ description: "a".repeat(101) }).description).toBe(
      "Opis może mieć maksymalnie 100 znaków.",
    );
  });

  it("counts the description after trimming", () => {
    expect(
      errorsOf({ description: ` ${"a".repeat(100)} ` }).description,
    ).toBeUndefined();
  });

  it("asks for a category and rejects an unknown one", () => {
    expect(errorsOf({ categoryId: "" }).categoryId).toBe("Wybierz kategorię.");
    expect(errorsOf({ categoryId: "999" }).categoryId).toBe(
      "Wybierz kategorię.",
    );
  });

  it("asks for a date when it is empty or malformed", () => {
    expect(errorsOf({ date: "" }).date).toBe("Wybierz datę transakcji.");
    expect(errorsOf({ date: "19.11.2026" }).date).toBe(
      "Wybierz datę transakcji.",
    );
  });

  it("reports every invalid field at once", () => {
    const result = parseTransactionForm(
      {
        amount: "",
        currency: "PLN",
        description: "",
        categoryId: "",
        date: "",
      },
      TEST_CATEGORIES,
    );

    expect(result.status === "invalid" && Object.keys(result.errors)).toEqual([
      "amount",
      "description",
      "categoryId",
      "date",
    ]);
  });
});
