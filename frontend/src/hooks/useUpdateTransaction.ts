import { useToast } from "@/hooks/useToast";
import { updateTransaction } from "@/lib/api/transactions";
import { readSessionToken } from "@/lib/auth/session";
import type { UpdateTransactionRequest } from "@/types/api";

export const TRANSACTION_UPDATED_MESSAGE = "Transakcja została zaktualizowana";

type UseUpdateTransactionOptions = {
  // Runs after the PUT succeeded and before the toast: closes the dialog and reloads the list.
  onUpdated: (id: string) => void;
};

// The returned function rejects when saving fails: the dialog shows the message.
export function useUpdateTransaction({
  onUpdated,
}: UseUpdateTransactionOptions): (
  id: string,
  request: UpdateTransactionRequest,
) => Promise<void> {
  const { showToast } = useToast();

  return async function update(id, request) {
    const token = readSessionToken();
    if (token === undefined) {
      throw new Error("Missing session token");
    }
    await updateTransaction(token, id, request);
    onUpdated(id);
    showToast(TRANSACTION_UPDATED_MESSAGE);
  };
}
