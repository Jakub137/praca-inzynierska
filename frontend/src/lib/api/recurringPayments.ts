import { apiRequest } from "@/lib/api/client";
import type {
  RecurringPaymentRequest,
  RecurringPaymentResponse,
} from "@/types/api";

// /recurring-payments is protected: it needs the Bearer token.
// The backend sorts the list (nearest due date first, then id) and the view keeps that order.
export function getRecurringPayments(
  token: string,
): Promise<readonly RecurringPaymentResponse[]> {
  return apiRequest<readonly RecurringPaymentResponse[]>(
    "/recurring-payments",
    {
      token,
    },
  );
}

// POST answers 201 with the created payment (with the category name).
export function createRecurringPayment(
  token: string,
  request: RecurringPaymentRequest,
): Promise<RecurringPaymentResponse> {
  return apiRequest<RecurringPaymentResponse>("/recurring-payments", {
    method: "POST",
    body: request,
    token,
  });
}
