import {
  FIRST_PAGE,
  type TransactionFilters,
} from "@/lib/transactions/filters";

const ONLY_ROW_ON_PAGE = 1;

// A page beyond the first that lost its only row no longer exists.
// Returns the filters of the previous page (the other filters stay), or null when the current page stays valid.
export function getFiltersAfterDelete(
  filters: TransactionFilters,
  rowsOnPage: number,
): TransactionFilters | null {
  if (rowsOnPage !== ONLY_ROW_ON_PAGE || filters.page <= FIRST_PAGE) {
    return null;
  }
  return { ...filters, page: filters.page - 1 };
}
