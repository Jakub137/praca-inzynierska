import { useToast } from "@/hooks/useToast";
import { setBudgetLimit } from "@/lib/api/budgets";
import { readSessionToken } from "@/lib/auth/session";
import type { SetBudgetLimitRequest } from "@/types/api";

export const LIMIT_CREATED_MESSAGE = "Dodano limit";
export const LIMIT_UPDATED_MESSAGE = "Zaktualizowano limit";

type UseSetBudgetLimitOptions = {
  // Runs after the POST succeeded and before the toast: closes the dialog and reloads the usage.
  onSaved: (request: SetBudgetLimitRequest) => void;
};

// The returned function rejects when saving fails: the dialog shows the message.
export function useSetBudgetLimit({
  onSaved,
}: UseSetBudgetLimitOptions): (
  request: SetBudgetLimitRequest,
) => Promise<void> {
  const { showToast } = useToast();

  return async function save(request) {
    const token = readSessionToken();
    if (token === undefined) {
      throw new Error("Missing session token");
    }
    const { created } = await setBudgetLimit(token, request);
    onSaved(request);
    showToast(created ? LIMIT_CREATED_MESSAGE : LIMIT_UPDATED_MESSAGE);
  };
}
