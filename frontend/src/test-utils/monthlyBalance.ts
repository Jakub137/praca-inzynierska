import type { MonthlyBalanceResponse } from "@/types/api";

export const TEST_BALANCE: readonly MonthlyBalanceResponse[] = [
  { month: "2026-09", income: 8000, expenses: 5200.5 },
  { month: "2026-10", income: 0, expenses: 0 },
  { month: "2026-11", income: 12500, expenses: 2250 },
];

export const EMPTY_BALANCE: readonly MonthlyBalanceResponse[] = [
  { month: "2026-09", income: 0, expenses: 0 },
  { month: "2026-10", income: 0, expenses: 0 },
  { month: "2026-11", income: 0, expenses: 0 },
];
