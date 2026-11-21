import { formatPercent, formatPln } from "@/lib/format/money";
import type { SavingsGoalResponse } from "@/types/api";

// The contribution is the API value (BigDecimal in the backend); it is only formatted here.
export function buildProgressHint(
  goal: SavingsGoalResponse,
  percent: number,
): string {
  const reached = `${formatPercent(percent)} celu osiągnięte`;
  if (goal.status === "COMPLETED") {
    return reached;
  }
  const contribution = formatPln(goal.monthlyContribution);
  if (goal.monthsRemaining > 0) {
    return `${reached} (odkładaj ${contribution}/mies.)`;
  }
  return `${reached} (odłóż ${contribution}, aby osiągnąć cel)`;
}
