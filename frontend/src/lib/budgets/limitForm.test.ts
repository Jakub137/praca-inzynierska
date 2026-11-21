import { describe, expect, it } from "vitest";
import {
  createEmptyLimitValues,
  getAssignableCategories,
  LIMIT_THRESHOLD_HINT,
  mapServerFieldErrors,
  parseLimitForm,
  toLimitFormValues,
} from "@/lib/budgets/limitForm";
import { NORMAL_USAGE } from "@/test-utils/budgets";
import { TEST_CATEGORIES } from "@/test-utils/categories";

const PERIOD = { year: 2026, month: 11 };
const ALLOWED = [1, 2];

describe("parseLimitForm", () => {
  it("builds the request with the explicit period and the amount as a number", () => {
    const result = parseLimitForm(
      { categoryId: "2", limitAmount: "1500,5" },
      ALLOWED,
      PERIOD,
    );

    expect(result).toEqual({
      status: "valid",
      request: { categoryId: 2, month: 11, year: 2026, limitAmount: 1500.5 },
    });
  });

  it("accepts the upper bound 9999999999,99", () => {
    const result = parseLimitForm(
      { categoryId: "1", limitAmount: "9999999999,99" },
      ALLOWED,
      PERIOD,
    );

    expect(result).toMatchObject({
      status: "valid",
      request: { limitAmount: 9999999999.99 },
    });
  });

  it.each(["10000000000", "1,234", "abc", "-5", "12 000"])(
    "rejects the amount %s",
    (limitAmount) => {
      const result = parseLimitForm(
        { categoryId: "1", limitAmount },
        ALLOWED,
        PERIOD,
      );

      expect(result.status).toBe("invalid");
    },
  );

  it("asks for the amount when it is empty", () => {
    expect(
      parseLimitForm({ categoryId: "1", limitAmount: " " }, ALLOWED, PERIOD),
    ).toEqual({ status: "invalid", errors: { limitAmount: "Podaj kwotę." } });
  });

  it("rejects an amount that is not above zero", () => {
    expect(
      parseLimitForm({ categoryId: "1", limitAmount: "0" }, ALLOWED, PERIOD),
    ).toEqual({
      status: "invalid",
      errors: { limitAmount: "Kwota musi być większa od zera." },
    });
  });

  it.each(["", "9"])(
    "rejects the category %j that is not among the allowed ones",
    (categoryId) => {
      expect(
        parseLimitForm({ categoryId, limitAmount: "100" }, ALLOWED, PERIOD),
      ).toEqual({
        status: "invalid",
        errors: { categoryId: "Wybierz kategorię." },
      });
    },
  );

  it("reports both fields at once", () => {
    const result = parseLimitForm(createEmptyLimitValues(), ALLOWED, PERIOD);

    expect(result).toEqual({
      status: "invalid",
      errors: {
        categoryId: "Wybierz kategorię.",
        limitAmount: "Podaj kwotę.",
      },
    });
  });
});

describe("toLimitFormValues", () => {
  it("fills the amount like the transaction form does: comma, two fraction digits", () => {
    expect(toLimitFormValues(NORMAL_USAGE)).toEqual({
      categoryId: "1",
      limitAmount: "1500,00",
    });
  });
});

describe("getAssignableCategories", () => {
  it("keeps only expense categories without a limit", () => {
    const result = getAssignableCategories(TEST_CATEGORIES, [1]);

    expect(result.map((category) => category.name)).toEqual(["Rozrywka"]);
  });
});

describe("mapServerFieldErrors", () => {
  it("maps the fields of the form and ignores the others", () => {
    const result = mapServerFieldErrors([
      { field: "limitAmount", message: "Limit musi być większy od zera" },
      { field: "categoryId", message: "Kategoria jest wymagana" },
      { field: "month", message: "Miesiąc jest wymagany" },
    ]);

    expect(result).toEqual({
      limitAmount: "Limit musi być większy od zera",
      categoryId: "Kategoria jest wymagana",
    });
  });

  it("returns no errors without field errors", () => {
    expect(mapServerFieldErrors(undefined)).toEqual({});
  });
});

describe("LIMIT_THRESHOLD_HINT", () => {
  it("states the thresholds of BudgetUsageCalculator (80% and 100%)", () => {
    expect(LIMIT_THRESHOLD_HINT).toBe(
      "Ostrzeżenie pojawi się po wykorzystaniu 80% limitu, a przekroczenie od 100%. Progi są takie same dla wszystkich limitów.",
    );
  });
});
