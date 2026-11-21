import type { BudgetUsageResponse } from "@/types/api";

export const NORMAL_USAGE: BudgetUsageResponse = {
  categoryId: 1,
  categoryName: "Artykuły spożywcze",
  limitAmount: 1500,
  spentAmount: 1140,
  percentage: 76,
  status: "NORMAL",
};

// 99.6% is still WARNING: the card must show 99%, never 100%.
export const WARNING_USAGE: BudgetUsageResponse = {
  categoryId: 2,
  categoryName: "Rozrywka",
  limitAmount: 1000,
  spentAmount: 996,
  percentage: 99.6,
  status: "WARNING",
};

export const EXCEEDED_USAGE: BudgetUsageResponse = {
  categoryId: 3,
  categoryName: "Paliwo",
  limitAmount: 500,
  spentAmount: 921,
  percentage: 184.2,
  status: "EXCEEDED",
};

export const TEST_BUDGET_USAGE: readonly BudgetUsageResponse[] = [
  NORMAL_USAGE,
  WARNING_USAGE,
  EXCEEDED_USAGE,
];
