import type { SavingsGoalResponse } from "@/types/api";

// The list keeps the order of the API (nearest deadline first): the client does not sort it.
// First active goal; when every goal is completed, the first one on the list; without goals, none.
export function selectPrimaryGoal(
  goals: readonly SavingsGoalResponse[],
): SavingsGoalResponse | undefined {
  return goals.find((goal) => goal.status === "ACTIVE") ?? goals[0];
}
