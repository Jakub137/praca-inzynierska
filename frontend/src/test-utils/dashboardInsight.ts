import type { DashboardInsightResponse } from "@/types/api";

// Category 2 is "Rozrywka", the same id as WARNING_USAGE in test-utils/budgets.ts.
export const TEST_INSIGHT_MESSAGE =
  "W kategorii Rozrywka wydałeś o 45% więcej niż średnio w ostatnich 3 miesiącach.";

export const TEST_INSIGHT_RESPONSE: DashboardInsightResponse = {
  categoryId: 2,
  categoryName: "Rozrywka",
  increasePercent: 45,
  currentAmount: 435,
  averageAmount: 300,
  message: TEST_INSIGHT_MESSAGE,
};

// No anomaly: the backend answers 200 with every field null.
export const NO_INSIGHT_RESPONSE: DashboardInsightResponse = {
  categoryId: null,
  categoryName: null,
  increasePercent: null,
  currentAmount: null,
  averageAmount: null,
  message: null,
};
