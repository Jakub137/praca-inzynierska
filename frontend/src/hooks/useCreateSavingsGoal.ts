import { useToast } from "@/hooks/useToast";
import { createSavingsGoal } from "@/lib/api/goals";
import { readSessionToken } from "@/lib/auth/session";
import type { SavingsGoalRequest } from "@/types/api";

export const GOAL_CREATED_MESSAGE = "Dodano cel";

type UseCreateSavingsGoalOptions = {
  // Runs after the POST succeeded and before the toast: closes the dialog and reloads the goals.
  onSaved: () => void;
};

// The returned function rejects when saving fails: the dialog shows the message.
export function useCreateSavingsGoal({
  onSaved,
}: UseCreateSavingsGoalOptions): (
  request: SavingsGoalRequest,
) => Promise<void> {
  const { showToast } = useToast();

  return async function save(request) {
    const token = readSessionToken();
    if (token === undefined) {
      throw new Error("Missing session token");
    }
    await createSavingsGoal(token, request);
    onSaved();
    showToast(GOAL_CREATED_MESSAGE);
  };
}
