"use client";

import type { RefObject } from "react";
import { GoalFormFields } from "@/components/goals/GoalFormFields";
import { FormDialogFrame } from "@/components/ui/FormDialogFrame";
import { useGoalForm } from "@/hooks/useGoalForm";
import type { SavingsGoalRequest } from "@/types/api";

type NewGoalDialogProps = {
  // Calendar day (RRRR-MM-DD, business zone) read when the dialog was opened.
  today: string;
  onClose: () => void;
  // Rejects with the failure: the dialog stays open and shows its message.
  onSubmit: (request: SavingsGoalRequest) => Promise<void>;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

export function NewGoalDialog({
  today,
  onClose,
  onSubmit,
  returnFocusRef,
}: NewGoalDialogProps) {
  const form = useGoalForm({ today, onSubmit });

  return (
    <FormDialogFrame
      title="Nowy cel"
      description="Zaplanuj oszczędzanie: podaj nazwę, kwotę i termin celu"
      submitLabel="Zapisz cel"
      form={form}
      onClose={onClose}
      initialFocusRef={form.refs.name}
      returnFocusRef={returnFocusRef}
    >
      <GoalFormFields form={form} today={today} />
    </FormDialogFrame>
  );
}
