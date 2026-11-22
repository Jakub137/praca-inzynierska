"use client";

import type { RefObject } from "react";
import { FormDialogFrame } from "@/components/ui/FormDialogFrame";
import { FormInput } from "@/components/ui/FormInput";
import { useDepositForm } from "@/hooks/useDepositForm";
import { formatPln } from "@/lib/format/money";
import { DEPOSIT_AMOUNT_INPUT_MAX_LENGTH } from "@/lib/goals/depositForm";
import type { DepositToGoalRequest, SavingsGoalResponse } from "@/types/api";

type DepositDialogProps = {
  goal: SavingsGoalResponse;
  onClose: () => void;
  // Rejects with the failure: the dialog stays open and shows its message.
  onSubmit: (request: DepositToGoalRequest) => Promise<void>;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

export function DepositDialog({
  goal,
  onClose,
  onSubmit,
  returnFocusRef,
}: DepositDialogProps) {
  const form = useDepositForm({ onSubmit });
  const { values, errors, refs, setField } = form;

  // Destructured on purpose: after ref={…}, react-hooks/refs reports every later refs.* read.
  const { amount: amountRef } = refs;

  return (
    <FormDialogFrame
      title={`Wpłata na cel: ${goal.name}`}
      description={`Zebrano ${formatPln(goal.currentAmount)} z ${formatPln(goal.targetAmount)}`}
      submitLabel="Wpłać"
      form={form}
      onClose={onClose}
      initialFocusRef={amountRef}
      returnFocusRef={returnFocusRef}
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted">Pola oznaczone * są wymagane.</p>
        <FormInput
          ref={amountRef}
          label="Kwota wpłaty (PLN) *"
          name="amount"
          inputMode="decimal"
          autoComplete="off"
          maxLength={DEPOSIT_AMOUNT_INPUT_MAX_LENGTH}
          value={values.amount}
          onChange={(event) => setField("amount", event.target.value)}
          error={errors.amount}
        />
      </div>
    </FormDialogFrame>
  );
}
