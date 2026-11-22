import type { DashboardSummaryResponse } from "@/types/api";

export const TEST_SUMMARY: DashboardSummaryResponse = {
  month: "2026-11",
  availableFunds: 14250,
  availableFundsChangePercent: 12.5,
  monthExpenses: 3820.5,
  monthIncome: 7500,
  monthLimitTotal: 5000,
};

// No limits and no earlier balance: the API answers null and the cards leave the lines out.
export const SUMMARY_WITHOUT_OPTIONALS: DashboardSummaryResponse = {
  ...TEST_SUMMARY,
  availableFundsChangePercent: null,
  monthLimitTotal: null,
};
