import { useToast } from "@/hooks/useToast";
import { deleteTransaction } from "@/lib/api/transactions";
import { readSessionToken } from "@/lib/auth/session";

export const TRANSACTION_DELETED_MESSAGE = "Transakcja została usunięta";

type UseDeleteTransactionOptions = {
  // Runs after the DELETE succeeded and before the toast: closes the dialog and reloads the list.
  onDeleted: () => void;
};

// The returned function rejects when deleting fails: the dialog shows the message.
export function useDeleteTransaction({
  onDeleted,
}: UseDeleteTransactionOptions): (id: string) => Promise<void> {
  const { showToast } = useToast();

  return async function remove(id) {
    const token = readSessionToken();
    if (token === undefined) {
      throw new Error("Missing session token");
    }
    await deleteTransaction(token, id);
    onDeleted();
    showToast(TRANSACTION_DELETED_MESSAGE);
  };
}
