import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionsView } from "@/components/transactions/TransactionsView";
import type { CategoriesState } from "@/hooks/useCategories";
import type { UseTransactionsResult } from "@/hooks/useTransactions";
import {
  DEFAULT_TRANSACTION_FILTERS,
  type TransactionFilters,
} from "@/lib/transactions/filters";
import { TEST_CATEGORIES } from "@/test-utils/categories";
import {
  makePage,
  TEST_MONTH_OPTIONS,
  TEST_TRANSACTIONS,
} from "@/test-utils/transactions";

const useTransactionsMock = vi.hoisted(() =>
  vi.fn<(filters: TransactionFilters) => UseTransactionsResult>(),
);
const useCategoriesMock = vi.hoisted(() => vi.fn<() => CategoriesState>());

vi.mock("@/hooks/useTransactions", () => ({
  useTransactions: useTransactionsMock,
}));
vi.mock("@/hooks/useCategories", () => ({
  useCategories: useCategoriesMock,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const retryMock = vi.fn();

function renderWithState(
  state: UseTransactionsResult["state"],
  filters: TransactionFilters = DEFAULT_TRANSACTION_FILTERS,
) {
  useTransactionsMock.mockReturnValue({ state, retry: retryMock });
  return render(
    <TransactionsView filters={filters} monthOptions={TEST_MONTH_OPTIONS} />,
  );
}

describe("TransactionsView", () => {
  beforeEach(() => {
    retryMock.mockReset();
    useTransactionsMock.mockReset();
    useCategoriesMock.mockReturnValue({
      status: "ready",
      categories: TEST_CATEGORIES,
    });
  });

  it("renders nothing while idle", () => {
    const { container } = renderWithState({ status: "idle" });

    expect(container.firstChild).toBeNull();
  });

  it("passes the filters to the hook", () => {
    const filters: TransactionFilters = {
      page: 2,
      month: "2026-10",
      type: "EXPENSE",
      categoryId: 2,
    };

    renderWithState({ status: "loading" }, filters);

    expect(useTransactionsMock).toHaveBeenCalledWith(filters);
  });

  it("renders an accessible loading skeleton and keeps the filters visible", () => {
    renderWithState({ status: "loading" });

    expect(screen.getByRole("status").textContent).toBe("Ładowanie transakcji");
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByLabelText("Okres")).toBeTruthy();
  });

  it("renders the empty state without a button when there are no transactions", () => {
    renderWithState({ status: "ready", page: makePage([]) });

    expect(
      screen.getByRole("heading", { name: "Brak transakcji" }),
    ).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders the plain empty state for an empty account even on a later page", () => {
    renderWithState(
      { status: "ready", page: makePage([]) },
      { ...DEFAULT_TRANSACTION_FILTERS, page: 3 },
    );

    expect(
      screen.getByRole("heading", { name: "Brak transakcji" }),
    ).toBeTruthy();
  });

  it("offers to clear the filters when nothing matches them", () => {
    renderWithState(
      { status: "ready", page: makePage([]) },
      { ...DEFAULT_TRANSACTION_FILTERS, type: "INCOME" },
    );

    expect(
      screen.getByRole("heading", {
        name: "Brak transakcji dla wybranych filtrów",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Wyczyść filtry" }).getAttribute("href"),
    ).toBe("/transactions");
    expect(
      screen.queryByRole("heading", { name: "Brak transakcji" }),
    ).toBeNull();
  });

  it("links back to the first page when the page is out of range", () => {
    renderWithState(
      {
        status: "ready",
        page: makePage([], { page: 4, totalElements: 30, totalPages: 2 }),
      },
      { page: 5, month: null, type: "EXPENSE", categoryId: null },
    );

    expect(
      screen.getByRole("heading", { name: "Nie ma takiej strony wyników" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Przejdź do pierwszej strony" })
        .getAttribute("href"),
    ).toBe("/transactions?type=EXPENSE");
  });

  it("renders an error alert and retries on click", () => {
    renderWithState({ status: "error" });

    expect(screen.getByRole("alert").textContent).toContain(
      "Nie udało się wczytać transakcji.",
    );
    expect(screen.queryByRole("table")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));

    expect(retryMock).toHaveBeenCalledTimes(1);
  });

  it("renders the table with one row per transaction and the range summary", () => {
    renderWithState({ status: "ready", page: makePage(TEST_TRANSACTIONS) });

    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getAllByRole("row")).toHaveLength(
      TEST_TRANSACTIONS.length + 1,
    );
    expect(screen.getByText("Pokazano 1–3 z 3 transakcji")).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Brak transakcji" }),
    ).toBeNull();
  });
});
