import { describe, expect, it } from "vitest";
import {
  createEmptyRecurringValues,
  getExpenseCategories,
  mapRecurringServerErrors,
  parseRecurringForm,
  RECURRING_AMOUNT_INPUT_MAX_LENGTH,
  RECURRING_NAME_MAX_LENGTH,
} from "@/lib/recurring/recurringForm";
import { TEST_CATEGORIES } from "@/test-utils/categories";

const TODAY = "2026-11-21";
const VALID = {
  name: "Netflix",
  amount: "43",
  currency: "PLN",
  categoryId: "2",
  frequency: "MONTHLY",
  nextDueDate: "2026-12-01",
};
// Copied from RecurringPaymentCommand and RecurringPaymentDates (backend).
const PAST =
  "Termin następnej płatności nie może być w przeszłości. Wybierz dzisiejszą lub późniejszą datę.";
const TOO_LATE =
  "Termin następnej płatności może przypadać najpóźniej 31.12.2100. Wybierz wcześniejszą datę.";
const REQUIRED = "Termin następnej płatności jest wymagany";

describe("parseRecurringForm", () => {
  it("exports the limits shared with the backend", () => {
    expect(RECURRING_NAME_MAX_LENGTH).toBe(100);
    expect(RECURRING_AMOUNT_INPUT_MAX_LENGTH).toBe(13);
  });

  it("builds the request with a trimmed name, the amount as a number and the chosen values", () => {
    const result = parseRecurringForm(
      {
        name: "  Spotify  ",
        amount: "9,99",
        currency: "EUR",
        categoryId: "7",
        frequency: "YEARLY",
        nextDueDate: "2026-11-22",
      },
      TODAY,
    );

    expect(result).toEqual({
      status: "valid",
      request: {
        name: "Spotify",
        amount: 9.99,
        currency: "EUR",
        frequency: "YEARLY",
        nextDueDate: "2026-11-22",
        categoryId: 7,
      },
    });
  });

  it("reports the empty fields with their messages and keeps the defaults valid", () => {
    const result = parseRecurringForm(createEmptyRecurringValues(), TODAY);

    expect(result).toEqual({
      status: "invalid",
      errors: {
        name: "Nazwa płatności jest wymagana",
        amount: "Podaj kwotę.",
        categoryId: "Kategoria jest wymagana",
        nextDueDate: REQUIRED,
      },
    });
  });

  it("treats a name of spaces as empty", () => {
    const result = parseRecurringForm({ ...VALID, name: "   " }, TODAY);

    expect(result).toEqual({
      status: "invalid",
      errors: { name: "Nazwa płatności jest wymagana" },
    });
  });

  it("accepts a name of 100 characters and rejects one of 101", () => {
    expect(
      parseRecurringForm({ ...VALID, name: "a".repeat(100) }, TODAY).status,
    ).toBe("valid");
    expect(
      parseRecurringForm({ ...VALID, name: "a".repeat(101) }, TODAY),
    ).toEqual({
      status: "invalid",
      errors: { name: "Nazwa płatności może mieć maksymalnie 100 znaków" },
    });
  });

  it("accepts the upper bound 9999999999,99 of the amount", () => {
    const result = parseRecurringForm(
      { ...VALID, amount: "9999999999,99" },
      TODAY,
    );

    expect(result).toMatchObject({
      status: "valid",
      request: { amount: 9999999999.99 },
    });
  });

  it.each(["10000000000", "1,234", "abc", "-5", "0", "12 000"])(
    "rejects the amount %s",
    (amount) => {
      const result = parseRecurringForm({ ...VALID, amount }, TODAY);

      expect(result.status).toBe("invalid");
    },
  );

  it("accepts today as the next due date", () => {
    expect(
      parseRecurringForm({ ...VALID, nextDueDate: TODAY }, TODAY).status,
    ).toBe("valid");
  });

  it.each([
    ["2026-11-20", PAST],
    ["2101-01-01", TOO_LATE],
    ["", REQUIRED],
  ])("rejects the date %j", (nextDueDate, message) => {
    const result = parseRecurringForm({ ...VALID, nextDueDate }, TODAY);

    expect(result).toEqual({
      status: "invalid",
      errors: { nextDueDate: message },
    });
  });

  it("accepts the last allowed date", () => {
    expect(
      parseRecurringForm({ ...VALID, nextDueDate: "2100-12-31" }, TODAY).status,
    ).toBe("valid");
  });

  it("reports a currency that is not supported", () => {
    const result = parseRecurringForm({ ...VALID, currency: "" }, TODAY);

    expect(result).toEqual({
      status: "invalid",
      errors: { currency: "Waluta jest wymagana" },
    });
  });

  it("reports a frequency that is not supported", () => {
    const result = parseRecurringForm({ ...VALID, frequency: "DAILY" }, TODAY);

    expect(result).toEqual({
      status: "invalid",
      errors: { frequency: "Częstotliwość jest wymagana" },
    });
  });

  it.each(["", "abc", "0", "-3", "1.5"])(
    "rejects the category id %j",
    (categoryId) => {
      const result = parseRecurringForm({ ...VALID, categoryId }, TODAY);

      expect(result).toEqual({
        status: "invalid",
        errors: { categoryId: "Kategoria jest wymagana" },
      });
    },
  );
});

describe("getExpenseCategories", () => {
  it("keeps only the expense categories in their order", () => {
    expect(getExpenseCategories(TEST_CATEGORIES).map((c) => c.id)).toEqual([
      1, 2,
    ]);
  });
});

describe("mapRecurringServerErrors", () => {
  it("maps the fields of the form and ignores the others", () => {
    const result = mapRecurringServerErrors([
      { field: "nextDueDate", message: PAST },
      { field: "name", message: "Nazwa płatności jest wymagana" },
      { field: "userId", message: "Nieznane pole" },
    ]);

    expect(result).toEqual({
      name: "Nazwa płatności jest wymagana",
      nextDueDate: PAST,
    });
  });

  it("returns no errors without field errors", () => {
    expect(mapRecurringServerErrors(undefined)).toEqual({});
  });
});
