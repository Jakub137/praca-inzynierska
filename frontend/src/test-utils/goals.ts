import type { SavingsGoalResponse } from "@/types/api";

// The fixed "today" of the card tests (a Saturday in the business time zone).
export const TEST_TODAY = "2026-11-21";

export const ACTIVE_GOAL: SavingsGoalResponse = {
  id: 1,
  name: "Wakacje we Włoszech",
  targetAmount: 6000,
  currentAmount: 4500,
  // 2026-11-21 → 2027-07-21: 8 full months (ChronoUnit.MONTHS.between in T-058), 1500 / 8 = 187.50.
  targetDate: "2027-07-21",
  status: "ACTIVE",
  monthsRemaining: 8,
  monthlyContribution: 187.5,
};

// The deadline passed: the API still answers with 0 months and the whole remaining amount.
export const OVERDUE_GOAL: SavingsGoalResponse = {
  id: 2,
  name: "Nowy laptop",
  targetAmount: 8000,
  currentAmount: 1200,
  targetDate: "2026-10-01",
  status: "ACTIVE",
  monthsRemaining: 0,
  monthlyContribution: 6800,
};

// The deadline is ahead but under a month away: also 0 months.
export const DUE_SOON_GOAL: SavingsGoalResponse = {
  id: 3,
  name: "Rower",
  targetAmount: 500,
  currentAmount: 100,
  targetDate: "2026-12-10",
  status: "ACTIVE",
  monthsRemaining: 0,
  monthlyContribution: 400,
};

// Overpaid: 108% of the target, the bar is clamped by ProgressBar.
export const COMPLETED_GOAL: SavingsGoalResponse = {
  id: 4,
  name: "Poduszka finansowa",
  targetAmount: 6000,
  currentAmount: 6500,
  targetDate: "2027-12-31",
  status: "COMPLETED",
  monthsRemaining: 13,
  monthlyContribution: 0,
};

export const TEST_GOALS: readonly SavingsGoalResponse[] = [
  ACTIVE_GOAL,
  OVERDUE_GOAL,
  DUE_SOON_GOAL,
  COMPLETED_GOAL,
];
