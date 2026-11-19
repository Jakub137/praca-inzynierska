import { useToast } from "@/hooks/useToast";
import { createTransaction } from "@/lib/api/transactions";
import { readSessionToken } from "@/lib/auth/session";
import type { CreateTransactionRequest } from "@/types/api";

export const TRANSACTION_SAVED_MESSAGE =
  "Transakcja została zapisana pomyślnie";

type UseCreateTransactionOptions = {
  // Runs after the POST succeeded and before the toast: closes the dialog and reloads the list.
  onCreated: () => void;
};

// The returned function rejects when saving fails: the dialog shows the message.
export function useCreateTransaction({
  onCreated,
}: UseCreateTransactionOptions): (
  request: CreateTransactionRequest,
) => Promise<void> {
  const { showToast } = useToast();

  return async function create(request) {
    const token = readSessionToken();
    if (token === undefined) {
      throw new Error("Missing session token");
    }
    await createTransaction(token, request);
    onCreated();
    showToast(TRANSACTION_SAVED_MESSAGE);
  };
}
