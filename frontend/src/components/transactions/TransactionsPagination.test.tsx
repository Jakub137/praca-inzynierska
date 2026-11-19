import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TransactionsPagination } from "@/components/transactions/TransactionsPagination";
import {
  DEFAULT_TRANSACTION_FILTERS,
  type TransactionFilters,
} from "@/lib/transactions/filters";
import {
  EXPENSE_PLN,
  makePage,
  TEST_TRANSACTIONS,
} from "@/test-utils/transactions";

function makeRows(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    ...EXPENSE_PLN,
    id: `row-${index}`,
  }));
}

// 128 transactions at 15 per page: 9 pages, the last one holds 8 rows.
function renderPage(
  pageIndex: number,
  filters: TransactionFilters = DEFAULT_TRANSACTION_FILTERS,
) {
  const rows = makeRows(pageIndex === 8 ? 8 : 15);
  render(
    <TransactionsPagination
      filters={{ ...filters, page: pageIndex + 1 }}
      result={makePage(rows, {
        page: pageIndex,
        totalElements: 128,
        totalPages: 9,
      })}
    />,
  );
}

describe("TransactionsPagination", () => {
  it("announces the visible range politely", () => {
    renderPage(0);

    const summary = screen.getByText("Pokazano 1–15 z 128 transakcji");
    expect(summary.getAttribute("aria-live")).toBe("polite");
  });

  it("marks the current page and links the others", () => {
    renderPage(0);

    expect(screen.getByRole("navigation", { name: "Paginacja" })).toBeTruthy();
    const current = screen.getByText("1");
    expect(current.getAttribute("aria-current")).toBe("page");
    expect(
      screen.getByRole("link", { name: "Strona 2" }).getAttribute("href"),
    ).toBe("/transactions?page=2");
    expect(
      screen.getByRole("link", { name: "Strona 9" }).getAttribute("href"),
    ).toBe("/transactions?page=9");
  });

  it("shows Poprzednia as a plain label on the first page", () => {
    renderPage(0);

    expect(screen.getByText("Poprzednia")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Poprzednia" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "Następna" }).getAttribute("href"),
    ).toBe("/transactions?page=2");
  });

  it("shows Następna as a plain label on the last page", () => {
    renderPage(8);

    expect(screen.getByText("Pokazano 121–128 z 128 transakcji")).toBeTruthy();
    expect(screen.getByText("Następna")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Następna" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "Poprzednia" }).getAttribute("href"),
    ).toBe("/transactions?page=8");
  });

  it("links the first page without a page parameter", () => {
    renderPage(1);

    expect(
      screen.getByRole("link", { name: "Poprzednia" }).getAttribute("href"),
    ).toBe("/transactions");
  });

  it("hides the dots from assistive technology", () => {
    renderPage(4);

    const dots = screen.getAllByText("…");
    expect(dots).toHaveLength(2);
    dots.forEach((dot) =>
      expect(dot.closest("li")?.getAttribute("aria-hidden")).toBe("true"),
    );
  });

  it("keeps the active filters in every link", () => {
    renderPage(0, {
      ...DEFAULT_TRANSACTION_FILTERS,
      month: "2026-10",
      type: "EXPENSE",
    });

    expect(
      screen.getByRole("link", { name: "Strona 2" }).getAttribute("href"),
    ).toBe("/transactions?month=2026-10&type=EXPENSE&page=2");
  });

  it("shows the range but no navigation when there is one page", () => {
    render(
      <TransactionsPagination
        filters={DEFAULT_TRANSACTION_FILTERS}
        result={makePage(TEST_TRANSACTIONS)}
      />,
    );

    expect(screen.getByText("Pokazano 1–3 z 3 transakcji")).toBeTruthy();
    expect(screen.queryByRole("navigation")).toBeNull();
  });
});
