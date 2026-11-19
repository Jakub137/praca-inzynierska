import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionsFilters } from "@/components/transactions/TransactionsFilters";
import type { CategoriesState } from "@/hooks/useCategories";
import {
  DEFAULT_TRANSACTION_FILTERS,
  type TransactionFilters,
} from "@/lib/transactions/filters";
import { TEST_CATEGORIES } from "@/test-utils/categories";
import { TEST_MONTH_OPTIONS } from "@/test-utils/transactions";

const pushMock = vi.hoisted(() => vi.fn());
const useCategoriesMock = vi.hoisted(() => vi.fn<() => CategoriesState>());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));
vi.mock("@/hooks/useCategories", () => ({
  useCategories: useCategoriesMock,
}));

function renderFilters(
  filters: TransactionFilters = DEFAULT_TRANSACTION_FILTERS,
) {
  return render(
    <TransactionsFilters filters={filters} monthOptions={TEST_MONTH_OPTIONS} />,
  );
}

function optionNames(select: HTMLElement): string[] {
  return within(select)
    .getAllByRole("option")
    .map((option) => option.textContent ?? "");
}

describe("TransactionsFilters", () => {
  beforeEach(() => {
    pushMock.mockReset();
    useCategoriesMock.mockReturnValue({
      status: "ready",
      categories: TEST_CATEGORIES,
    });
  });

  it("offers all periods and the given months", () => {
    renderFilters();

    expect(optionNames(screen.getByLabelText("Okres"))).toEqual([
      "Wszystkie okresy",
      "Listopad 2026",
      "Październik 2026",
    ]);
  });

  it("offers all types, expenses and income", () => {
    renderFilters();

    expect(optionNames(screen.getByLabelText("Typ"))).toEqual([
      "Wszystkie typy",
      "Wydatki",
      "Przychody",
    ]);
  });

  it("groups the categories into expenses and income", () => {
    const { container } = renderFilters();

    expect(optionNames(screen.getByLabelText("Kategoria"))).toEqual([
      "Wszystkie kategorie",
      "Artykuły spożywcze",
      "Rozrywka",
      "Wynagrodzenie",
    ]);
    expect(
      Array.from(container.querySelectorAll("optgroup")).map(
        (group) => group.label,
      ),
    ).toEqual(["Wydatki", "Przychody"]);
  });

  it.each<CategoriesState>([{ status: "loading" }, { status: "error" }])(
    "keeps only the all-categories option when the categories are %o",
    (state) => {
      useCategoriesMock.mockReturnValue(state);

      renderFilters();

      expect(optionNames(screen.getByLabelText("Kategoria"))).toEqual([
        "Wszystkie kategorie",
      ]);
    },
  );

  it("shows the current filters in the controls", () => {
    renderFilters({
      page: 2,
      month: "2026-10",
      type: "INCOME",
      categoryId: 9,
    });

    expect((screen.getByLabelText("Okres") as HTMLSelectElement).value).toBe(
      "2026-10",
    );
    expect((screen.getByLabelText("Typ") as HTMLSelectElement).value).toBe(
      "INCOME",
    );
    expect(
      (screen.getByLabelText("Kategoria") as HTMLSelectElement).value,
    ).toBe("9");
  });

  it("goes back to the first page when a filter changes", () => {
    renderFilters({ ...DEFAULT_TRANSACTION_FILTERS, page: 3 });

    fireEvent.change(screen.getByLabelText("Typ"), {
      target: { value: "EXPENSE" },
    });

    expect(pushMock).toHaveBeenCalledWith("/transactions?type=EXPENSE", {
      scroll: false,
    });
  });

  it("keeps the other filters when one changes", () => {
    renderFilters({
      page: 2,
      month: null,
      type: "INCOME",
      categoryId: 9,
    });

    fireEvent.change(screen.getByLabelText("Okres"), {
      target: { value: "2026-11" },
    });

    expect(pushMock).toHaveBeenCalledWith(
      "/transactions?month=2026-11&type=INCOME&categoryId=9",
      { scroll: false },
    );
  });

  it("removes the parameter when the all option is chosen", () => {
    renderFilters({ ...DEFAULT_TRANSACTION_FILTERS, type: "EXPENSE" });

    fireEvent.change(screen.getByLabelText("Typ"), { target: { value: "" } });

    expect(pushMock).toHaveBeenCalledWith("/transactions", { scroll: false });
  });

  it("filters by the chosen category", () => {
    renderFilters();

    fireEvent.change(screen.getByLabelText("Kategoria"), {
      target: { value: "2" },
    });

    expect(pushMock).toHaveBeenCalledWith("/transactions?categoryId=2", {
      scroll: false,
    });
  });

  it("shows the chosen value at once, before the address changes", () => {
    renderFilters();

    fireEvent.change(screen.getByLabelText("Typ"), {
      target: { value: "EXPENSE" },
    });

    expect((screen.getByLabelText("Typ") as HTMLSelectElement).value).toBe(
      "EXPENSE",
    );
  });

  it("builds the next change on the pending one", () => {
    renderFilters();

    fireEvent.change(screen.getByLabelText("Typ"), {
      target: { value: "EXPENSE" },
    });
    fireEvent.change(screen.getByLabelText("Kategoria"), {
      target: { value: "2" },
    });

    expect(pushMock).toHaveBeenLastCalledWith(
      "/transactions?type=EXPENSE&categoryId=2",
      { scroll: false },
    );
  });
});
