import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  TransactionDialog,
  type TransactionDialogProps,
} from "@/components/transactions/TransactionDialog";
import type { CategoriesState } from "@/hooks/useCategories";
import type { CurrencyRatesState } from "@/hooks/useCurrencyRates";
import { SUGGESTION_DEBOUNCE_MS } from "@/lib/transactions/categorySuggestion";
import { createEmptyFormValues } from "@/lib/transactions/transactionForm";
import { TEST_CATEGORIES } from "@/test-utils/categories";
import {
  AI_GROCERIES,
  KEYWORD_GROCERIES,
  NO_SUGGESTION,
} from "@/test-utils/categorySuggestion";
import { TEST_RATES } from "@/test-utils/currencyRates";
import { installDialogStub } from "@/test-utils/dialog";
import type {
  CategorySuggestionResponse,
  SuggestCategoryRequest,
} from "@/types/api";

const useCategoriesMock = vi.hoisted(() => vi.fn<() => CategoriesState>());
const useCurrencyRatesMock = vi.hoisted(() =>
  vi.fn<() => CurrencyRatesState>(),
);
const suggestCategoryMock = vi.hoisted(() =>
  vi.fn<
    (
      token: string,
      request: SuggestCategoryRequest,
    ) => Promise<CategorySuggestionResponse>
  >(),
);
const readSessionTokenMock = vi.hoisted(() =>
  vi.fn<() => string | undefined>(),
);

vi.mock("@/hooks/useCategories", () => ({
  useCategories: useCategoriesMock,
}));
vi.mock("@/hooks/useCurrencyRates", () => ({
  useCurrencyRates: useCurrencyRatesMock,
}));
vi.mock("@/lib/api/ai", () => ({ suggestCategory: suggestCategoryMock }));
vi.mock("@/lib/auth/session", () => ({
  readSessionToken: readSessionTokenMock,
}));

const AMOUNT = "Kwota transakcji *";
const DESCRIPTION = "Opis transakcji *";
const CATEGORY = "Kategoria *";
const BADGE_TEXT = "Moduł AI: 94% trafności";
const INITIAL_VALUES = createEmptyFormValues("2026-11-25");

function renderDialog(overrides: Partial<TransactionDialogProps> = {}) {
  const onSubmit = vi.fn(() => Promise.resolve());
  render(
    <TransactionDialog
      mode="create"
      initialValues={INITIAL_VALUES}
      onClose={vi.fn()}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );
  return { onSubmit };
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function categorySelect(): HTMLSelectElement {
  return screen.getByLabelText(CATEGORY) as HTMLSelectElement;
}

// Types the description and lets the delay and the answer pass inside act().
async function suggestFor(description: string) {
  fill(DESCRIPTION, description);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(SUGGESTION_DEBOUNCE_MS);
  });
}

describe("TransactionDialog category suggestion", () => {
  beforeAll(installDialogStub);

  beforeEach(() => {
    vi.useFakeTimers();
    useCategoriesMock.mockReturnValue({
      status: "ready",
      categories: TEST_CATEGORIES,
    });
    useCurrencyRatesMock.mockReturnValue({
      status: "ready",
      rates: TEST_RATES,
    });
    suggestCategoryMock.mockReset();
    suggestCategoryMock.mockResolvedValue(AI_GROCERIES);
    readSessionTokenMock.mockReset();
    readSessionTokenMock.mockReturnValue("token");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("selects the suggested category and shows the AI badge", async () => {
    renderDialog();

    await suggestFor("Biedronka zakupy na weekend");

    const badge = screen.getByText(BADGE_TEXT);
    expect(categorySelect().value).toBe("1");
    expect(categorySelect().getAttribute("aria-describedby")).toBe(badge.id);
  });

  it("keeps the neutral border and does not move the focus to the category", async () => {
    renderDialog();

    await suggestFor("Biedronka zakupy na weekend");

    expect(categorySelect().className).toContain("border-input-border");
    expect(categorySelect().className).not.toContain("border-brand");
    expect(document.activeElement).not.toBe(categorySelect());
  });

  it("announces the suggestion in the status region", async () => {
    renderDialog();

    await suggestFor("Biedronka zakupy na weekend");

    expect(screen.getByRole("status").textContent).toBe(
      "Podpowiedź kategorii: Artykuły spożywcze, trafność 94%.",
    );
  });

  it("selects a keyword suggestion without the badge", async () => {
    suggestCategoryMock.mockResolvedValue(KEYWORD_GROCERIES);
    renderDialog();

    await suggestFor("Biedronka zakupy na weekend");

    expect(categorySelect().value).toBe("1");
    expect(screen.queryByText(/Moduł AI/)).toBeNull();
    expect(screen.getByRole("status").textContent).toBe(
      "Podpowiedź kategorii: Artykuły spożywcze.",
    );
  });

  it("changes nothing when there is no suggestion", async () => {
    suggestCategoryMock.mockResolvedValue(NO_SUGGESTION);
    renderDialog();

    await suggestFor("xyz abc");

    expect(suggestCategoryMock).toHaveBeenCalledTimes(1);
    expect(categorySelect().value).toBe("");
    expect(screen.queryByText(/Moduł AI/)).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("removes the badge when the user picks another category and keeps the choice", async () => {
    renderDialog();
    await suggestFor("Biedronka zakupy na weekend");

    fill(CATEGORY, "2");
    await suggestFor("Biedronka zakupy na weekend i kino");

    expect(screen.queryByText(BADGE_TEXT)).toBeNull();
    expect(categorySelect().value).toBe("2");
    expect(suggestCategoryMock).toHaveBeenCalledTimes(1);
  });

  it("does not overwrite a category chosen before typing", async () => {
    renderDialog();

    fill(CATEGORY, "2");
    await suggestFor("Biedronka zakupy na weekend");

    expect(suggestCategoryMock).not.toHaveBeenCalled();
    expect(categorySelect().value).toBe("2");
  });

  it("removes the badge as soon as the description changes", async () => {
    renderDialog();
    await suggestFor("Biedronka zakupy na weekend");

    fill(DESCRIPTION, "Biedronka zakupy na weekend 2");

    expect(screen.queryByText(BADGE_TEXT)).toBeNull();
  });

  it("does not ask in edit mode", async () => {
    renderDialog({ mode: "edit" });

    await suggestFor("Biedronka zakupy na weekend");

    expect(suggestCategoryMock).not.toHaveBeenCalled();
    expect(categorySelect().value).toBe("");
  });

  it("saves the transaction with the suggested category", async () => {
    const { onSubmit } = renderDialog();
    fill(AMOUNT, "184,50");
    await suggestFor("Biedronka zakupy na weekend");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Zapisz wydatek" }));
    });

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryId: 1,
        type: "EXPENSE",
        description: "Biedronka zakupy na weekend",
      }),
    );
  });
});
