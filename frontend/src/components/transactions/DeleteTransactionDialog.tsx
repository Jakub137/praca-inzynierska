"use client";

import { type RefObject, useEffect, useRef, useState } from "react";
import { TransactionAmount } from "@/components/transactions/TransactionAmount";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { getUserMessage } from "@/lib/api/errors";
import { FOCUS_RING } from "@/lib/focusRing";
import { formatIsoDate } from "@/lib/format/date";
import { getTransactionTitle } from "@/lib/format/transactionTitle";
import type { TransactionResponse } from "@/types/api";

const DELETING_LABEL = "Usuwanie…";

type DeleteTransactionDialogProps = {
  transaction: TransactionResponse;
  onClose: () => void;
  // Rejects with the failure: the dialog stays open and shows its message.
  onConfirm: () => Promise<void>;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

export function DeleteTransactionDialog({
  transaction,
  onClose,
  onConfirm,
  returnFocusRef,
}: DeleteTransactionDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const isDeletingRef = useRef(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // After a failed request the focus moves to the message, not to the button that was just disabled.
  useEffect(() => {
    if (error !== null) {
      alertRef.current?.focus();
    }
  }, [error]);

  async function confirm() {
    // The ref stops a second click in the same tick, before the state disables the button.
    if (isDeletingRef.current) {
      return;
    }
    isDeletingRef.current = true;
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (failure) {
      setError(getUserMessage(failure));
    } finally {
      isDeletingRef.current = false;
      setIsDeleting(false);
    }
  }

  const footer = (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button
        ref={cancelRef}
        type="button"
        onClick={onClose}
        className={`min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium text-ink hover:bg-slate-100 ${FOCUS_RING}`}
      >
        Anuluj
      </button>
      <button
        type="button"
        onClick={() => void confirm()}
        disabled={isDeleting}
        className={`min-h-11 rounded-lg bg-danger px-4 text-sm font-medium text-white hover:underline disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
      >
        {isDeleting ? DELETING_LABEL : "Usuń"}
      </button>
    </div>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="Usuń transakcję"
      description="Czy na pewno chcesz usunąć tę transakcję?"
      initialFocusRef={cancelRef}
      returnFocusRef={returnFocusRef}
      footer={footer}
    >
      {error !== null && (
        <div className="mb-3">
          <Alert variant="error" ref={alertRef}>
            {error}
          </Alert>
        </div>
      )}
      <div className="flex flex-col gap-3">
        <div className="rounded-lg border border-line p-3">
          <p className="font-medium wrap-break-word text-ink">
            {`${getTransactionTitle(transaction)}, ${formatIsoDate(transaction.date)}`}
          </p>
          <div className="mt-1 text-sm">
            <TransactionAmount transaction={transaction} />
          </div>
        </div>
        <p className="text-sm text-muted">Tej operacji nie można cofnąć.</p>
      </div>
    </Modal>
  );
}
