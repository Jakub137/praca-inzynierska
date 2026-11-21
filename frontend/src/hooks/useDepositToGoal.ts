import { useToast } from "@/hooks/useToast";
import { depositToSavingsGoal } from "@/lib/api/goals";
import { readSessionToken } from "@/lib/auth/session";
import type { DepositToGoalRequest } from "@/types/api";

export const GOAL_DEPOSITED_MESSAGE = "Wpłacono na cel";

type UseDepositToGoalOptions = {
  // Runs after the POST succeeded and before the toast: remembers the card for the focus,
  // closes the dialog and reloads the goals.
  onSaved: (goalId: number) => void;
};

// The returned function rejects when the deposit fails: the dialog shows the message.
export function useDepositToGoal({
  onSaved,
}: UseDepositToGoalOptions): (
  goalId: number,
  request: DepositToGoalRequest,
) => Promise<void> {
  const { showToast } = useToast();

  return async function deposit(goalId, request) {
    const token = readSessionToken();
    if (token === undefined) {
      throw new Error("Missing session token");
    }
    await depositToSavingsGoal(token, goalId, request);
    onSaved(goalId);
    showToast(GOAL_DEPOSITED_MESSAGE);
  };
}
