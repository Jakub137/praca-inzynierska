import { describe, expect, it } from "vitest";
import { getFiltersAfterDelete } from "@/lib/transactions/deleteNavigation";
import type { TransactionFilters } from "@/lib/transactions/filters";

const LATER_PAGE: TransactionFilters = {
  page: 3,
  month: "2026-10",
  type: "EXPENSE",
  categoryId: 2,
};

describe("getFiltersAfterDelete", () => {
  it("goes back one page and keeps the other filters when the only row of a later page was deleted", () => {
    expect(getFiltersAfterDelete(LATER_PAGE, 1)).toEqual({
      ...LATER_PAGE,
      page: 2,
    });
  });

  it("stays on the page when it still has other rows", () => {
    expect(getFiltersAfterDelete(LATER_PAGE, 2)).toBeNull();
  });

  it("stays on the first page even when its only row was deleted", () => {
    expect(getFiltersAfterDelete({ ...LATER_PAGE, page: 1 }, 1)).toBeNull();
  });

  it("stays when the page has no known rows (list not loaded)", () => {
    expect(getFiltersAfterDelete(LATER_PAGE, 0)).toBeNull();
  });
});
