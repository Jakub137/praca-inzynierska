import { describe, expect, it } from "vitest";
import {
  buildSuggestionRequest,
  type CategorySuggestion,
  getCurrentSuggestion,
  toCategorySuggestion,
} from "@/lib/transactions/categorySuggestion";
import { TEST_CATEGORIES } from "@/test-utils/categories";
import {
  AI_GROCERIES,
  KEYWORD_GROCERIES,
  NO_SUGGESTION,
} from "@/test-utils/categorySuggestion";
import type { SuggestCategoryRequest } from "@/types/api";

const REQUEST: SuggestCategoryRequest = {
  description: "Biedronka zakupy",
  type: "EXPENSE",
};

const SUGGESTION: CategorySuggestion = {
  description: "Biedronka zakupy",
  type: "EXPENSE",
  categoryId: 1,
  aiConfidence: 94,
};

describe("buildSuggestionRequest", () => {
  it("returns null for a description shorter than three characters after trimming", () => {
    expect(buildSuggestionRequest("ab", "", "EXPENSE")).toBeNull();
    expect(buildSuggestionRequest("  ab  ", "", "EXPENSE")).toBeNull();
    expect(buildSuggestionRequest("   ", "", "EXPENSE")).toBeNull();
  });

  it("trims the description", () => {
    expect(buildSuggestionRequest("  Biedronka  ", "", "EXPENSE")).toEqual({
      description: "Biedronka",
      type: "EXPENSE",
    });
  });

  it("asks from exactly three characters", () => {
    expect(buildSuggestionRequest("abc", "", "EXPENSE")).toEqual({
      description: "abc",
      type: "EXPENSE",
    });
  });

  it("adds a valid amount as a number", () => {
    expect(buildSuggestionRequest("Biedronka", "184,50", "EXPENSE")).toEqual({
      description: "Biedronka",
      amount: 184.5,
      type: "EXPENSE",
    });
  });

  it("leaves out an amount that the form would reject", () => {
    for (const amountText of ["", "abc", "0", "1,234", "12345678901"]) {
      expect(
        buildSuggestionRequest("Biedronka", amountText, "EXPENSE"),
      ).toEqual({ description: "Biedronka", type: "EXPENSE" });
    }
  });

  it("passes the type of the form", () => {
    expect(buildSuggestionRequest("Premia roczna", "", "INCOME")).toEqual({
      description: "Premia roczna",
      type: "INCOME",
    });
  });
});

describe("toCategorySuggestion", () => {
  it("returns null for an answer without a category", () => {
    expect(
      toCategorySuggestion(NO_SUGGESTION, REQUEST, TEST_CATEGORIES),
    ).toBeNull();
  });

  it("returns null for a category that is not on the list", () => {
    const response = { ...AI_GROCERIES, categoryId: 99 };

    expect(toCategorySuggestion(response, REQUEST, TEST_CATEGORIES)).toBeNull();
  });

  it("returns null for a category of another type than asked", () => {
    const response = { ...AI_GROCERIES, categoryId: 9 };

    expect(toCategorySuggestion(response, REQUEST, TEST_CATEGORIES)).toBeNull();
  });

  it("keeps the confidence of an AI answer", () => {
    expect(
      toCategorySuggestion(AI_GROCERIES, REQUEST, TEST_CATEGORIES),
    ).toEqual(SUGGESTION);
  });

  it("gives a keyword answer no confidence", () => {
    expect(
      toCategorySuggestion(KEYWORD_GROCERIES, REQUEST, TEST_CATEGORIES),
    ).toEqual({ ...SUGGESTION, aiConfidence: null });
  });

  it("gives an AI answer without a confidence no badge", () => {
    const response = { ...AI_GROCERIES, confidence: null };

    expect(
      toCategorySuggestion(response, REQUEST, TEST_CATEGORIES)?.aiConfidence,
    ).toBeNull();
  });
});

describe("getCurrentSuggestion", () => {
  it("returns the suggestion while the form still matches it", () => {
    expect(
      getCurrentSuggestion(SUGGESTION, "Biedronka zakupy", "EXPENSE", "1"),
    ).toBe(SUGGESTION);
  });

  it("returns null after the description changed", () => {
    expect(
      getCurrentSuggestion(SUGGESTION, "Biedronka", "EXPENSE", "1"),
    ).toBeNull();
  });

  it("returns null after another category was chosen", () => {
    expect(
      getCurrentSuggestion(SUGGESTION, "Biedronka zakupy", "EXPENSE", "2"),
    ).toBeNull();
  });

  it("returns null after the type changed", () => {
    expect(
      getCurrentSuggestion(SUGGESTION, "Biedronka zakupy", "INCOME", "1"),
    ).toBeNull();
  });

  it("returns null when there is no suggestion", () => {
    expect(
      getCurrentSuggestion(null, "Biedronka zakupy", "EXPENSE", "1"),
    ).toBeNull();
  });
});
