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
export function buildBudgetsHref(month: string | null): string {
  if (month === null) {
    return BUDGETS_PATH;
  }
  return `${BUDGETS_PATH}?${new URLSearchParams({ month }).toString()}`;
}
