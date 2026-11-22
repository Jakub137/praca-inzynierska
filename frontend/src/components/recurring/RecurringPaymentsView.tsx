"use client";

import { type Ref, useRef, useState } from "react";
import { RepeatIcon } from "@/components/icons/RepeatIcon";
import { RecurringPaymentDialog } from "@/components/recurring/RecurringPaymentDialog";
import { RecurringPaymentsSkeleton } from "@/components/recurring/RecurringPaymentsSkeleton";
import { RecurringPaymentsTable } from "@/components/recurring/RecurringPaymentsTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { RetryError } from "@/components/ui/RetryError";
import { useCreateRecurringPayment } from "@/hooks/useCreateRecurringPayment";
import { useEditFocusRestore } from "@/hooks/useEditFocusRestore";
import {
  type RecurringPaymentsState,
  useRecurringPayments,
} from "@/hooks/useRecurringPayments";
import { PRIMARY_ACTION } from "@/lib/buttonStyles";
import { getTodayIso } from "@/lib/goals/deadline";

const ADD_PAYMENT_LABEL = "+ Dodaj płatność";

// No row has this id, so after a new payment the focus goes to the fallback of useEditFocusRestore:
// the add button in the header (the button that opened the dialog may be the one of the empty state,
// which is gone after the reload).
const NEW_PAYMENT_FOCUS_ID = "new-payment";

type ActiveState = Exclude<RecurringPaymentsState, { readonly status: "idle" }>;

type AddPaymentHandler = (opener: HTMLElement) => void;

type AddPaymentButtonProps = {
  onAdd: AddPaymentHandler;
  ref?: Ref<HTMLButtonElement>;
};

function AddPaymentButton({ onAdd, ref }: AddPaymentButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={(event) => onAdd(event.currentTarget)}
      className={PRIMARY_ACTION}
    >
      {ADD_PAYMENT_LABEL}
    </button>
  );
}

type RecurringPaymentsResultsProps = {
  state: ActiveState;
  onRetry: () => void;
  onAdd: AddPaymentHandler;
};

function RecurringPaymentsResults({
  state,
  onRetry,
  onAdd,
}: RecurringPaymentsResultsProps) {
  if (state.status === "loading") {
    return <RecurringPaymentsSkeleton />;
  }
  if (state.status === "error") {
    return (
      <RetryError
        message="Nie udało się wczytać płatności cyklicznych."
        onRetry={onRetry}
      />
    );
  }
  if (state.payments.length === 0) {
    return (
      <EmptyState
        icon={<RepeatIcon />}
        title="Brak płatności cyklicznych"
        description="Dodaj subskrypcje i stałe rachunki, np. Netflix albo czynsz, aby widzieć ich terminy."
        actionButton={<AddPaymentButton onAdd={onAdd} />}
      />
    );
  }
  return (
    <RecurringPaymentsTable payments={state.payments} today={state.today} />
  );
}

export function RecurringPaymentsView() {
  const { state, retry } = useRecurringPayments();
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  // Calendar day read when the dialog opens, so that rendering stays pure; null while it is closed.
  const [dialogToday, setDialogToday] = useState<string | null>(null);
  // After a saved payment the list reloads and its content is rebuilt: the focus goes back to the add button.
  const requestFocus = useEditFocusRestore(state, addButtonRef);

  // Order matters: remember where the focus goes, close the dialog, reload the list, then the hook
  // shows the toast.
  const createPayment = useCreateRecurringPayment({
    onSaved: () => {
      requestFocus(NEW_PAYMENT_FOCUS_ID);
      setDialogToday(null);
      retry();
    },
  });

  const openDialog: AddPaymentHandler = (opener) => {
    openerRef.current = opener;
    // The clock is read in the event handler, not during rendering.
    setDialogToday(getTodayIso(new Date()));
  };

  if (state.status === "idle") {
    return null;
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <AddPaymentButton ref={addButtonRef} onAdd={openDialog} />
      </div>
      <RecurringPaymentsResults
        state={state}
        onRetry={retry}
        onAdd={openDialog}
      />
      {dialogToday !== null && (
        <RecurringPaymentDialog
          today={dialogToday}
          returnFocusRef={openerRef}
          onClose={() => setDialogToday(null)}
          onSubmit={createPayment}
        />
      )}
    </div>
  );
}
