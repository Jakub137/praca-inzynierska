import { useToast } from "@/hooks/useToast";
import { createRecurringPayment } from "@/lib/api/recurringPayments";
import { readSessionToken } from "@/lib/auth/session";
import type { RecurringPaymentRequest } from "@/types/api";

export const RECURRING_PAYMENT_CREATED_MESSAGE = "Dodano płatność cykliczną";

type UseCreateRecurringPaymentOptions = {
  // Runs after the POST succeeded and before the toast: closes the dialog and reloads the list.
  onSaved: () => void;
};

// The returned function rejects when saving fails: the dialog shows the message.
export function useCreateRecurringPayment({
  onSaved,
}: UseCreateRecurringPaymentOptions): (
  request: RecurringPaymentRequest,
) => Promise<void> {
  const { showToast } = useToast();

  return async function save(request) {
    const token = readSessionToken();
    if (token === undefined) {
      throw new Error("Missing session token");
    }
    await createRecurringPayment(token, request);
    onSaved();
    showToast(RECURRING_PAYMENT_CREATED_MESSAGE);
  };
}
