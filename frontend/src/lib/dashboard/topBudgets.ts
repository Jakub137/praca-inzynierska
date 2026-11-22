import type { BudgetUsageResponse } from "@/types/api";

export const DASHBOARD_BUDGET_COUNT = 3;

// Highest usage first; equal percentages are told apart by the category name, so the order is stable.
function compareByUsage(
  a: BudgetUsageResponse,
  b: BudgetUsageResponse,
): number {
  return (
    b.percentage - a.percentage ||
    a.categoryName.localeCompare(b.categoryName, "pl")
  );
}

export function selectTopBudgets(
  usage: readonly BudgetUsageResponse[],
): readonly BudgetUsageResponse[] {
  return [...usage].sort(compareByUsage).slice(0, DASHBOARD_BUDGET_COUNT);
}
