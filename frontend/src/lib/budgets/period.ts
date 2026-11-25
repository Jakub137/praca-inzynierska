const BUDGETS_PATH = "/budgets";

export type BudgetPeriod = {
  readonly year: number;
  // 1-12
  readonly month: number;
};

// "RRRR-MM" (already checked against the month list) to the API parameters.
export function monthToBudgetPeriod(month: string): BudgetPeriod {
  const [year, monthNumber] = month.split("-").map(Number);
  return { year, month: monthNumber };
}

// No month in the address means "the current month": the backend picks it.
// editCategoryId: the limit dialog of this category opens when the page loads (the dashboard banner).
export function buildBudgetsHref(
  month: string | null,
  editCategoryId: number | null = null,
): string {
  const query = new URLSearchParams();
  if (month !== null) {
    query.set("month", month);
  }
  if (editCategoryId !== null) {
    query.set("edit", String(editCategoryId));
  }
  const queryString = query.toString();
  return queryString === "" ? BUDGETS_PATH : `${BUDGETS_PATH}?${queryString}`;
}
