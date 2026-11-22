"use client";

import type { RefObject } from "react";
import { RecurringPaymentFormFields } from "@/components/recurring/RecurringPaymentFormFields";
import type { CategoriesStatus } from "@/components/transactions/TransactionFormFields";
import { FormDialogFrame } from "@/components/ui/FormDialogFrame";
import { type CategoriesState, useCategories } from "@/hooks/useCategories";
import { useRecurringPaymentForm } from "@/hooks/useRecurringPaymentForm";
import { getExpenseCategories } from "@/lib/recurring/recurringForm";
import type { CategoryResponse, RecurringPaymentRequest } from "@/types/api";

const NO_CATEGORIES: readonly CategoryResponse[] = [];

type RecurringPaymentDialogProps = {
  // Calendar day (RRRR-MM-DD, business zone) read when the dialog was opened.
  today: string;
  onClose: () => void;
  // Rejects with the failure: the dialog stays open and shows its message.
  onSubmit: (request: RecurringPaymentRequest) => Promise<void>;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

// "idle" only happens without a session; the dialog cannot be open then, so it counts as loading.
function toCategoriesStatus(state: CategoriesState): CategoriesStatus {
  if (state.status === "ready" || state.status === "error") {
    return state.status;
  }
  return "loading";
}

export function RecurringPaymentDialog({
  today,
  onClose,
  onSubmit,
  returnFocusRef,
}: RecurringPaymentDialogProps) {
  // The categories are fetched when the dialog opens, so closing and opening it again retries a failure.
  const categoriesState = useCategories();
  const categories =
    categoriesState.status === "ready"
      ? getExpenseCategories(categoriesState.categories)
      : NO_CATEGORIES;
  const form = useRecurringPaymentForm({ today, onSubmit });

  return (
    <FormDialogFrame
      title="Dodaj płatność cykliczną"
      description="Zaplanuj stały wydatek lub subskrypcję"
      submitLabel="Zapisz płatność"
      form={form}
      onClose={onClose}
      initialFocusRef={form.refs.name}
      returnFocusRef={returnFocusRef}
    >
      <RecurringPaymentFormFields
        form={form}
        categories={categories}
        categoriesStatus={toCategoriesStatus(categoriesState)}
        today={today}
      />
    </FormDialogFrame>
  );
}
