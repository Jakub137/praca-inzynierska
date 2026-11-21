"use client";

import { FormInput } from "@/components/ui/FormInput";
import type { GoalFormState } from "@/hooks/useGoalForm";
import {
  GOAL_AMOUNT_INPUT_MAX_LENGTH,
  GOAL_NAME_MAX_LENGTH,
} from "@/lib/goals/goalForm";
import { getTomorrowIso, MAX_TARGET_DATE } from "@/lib/goals/targetDate";

type GoalFormFieldsProps = {
  form: GoalFormState;
  // Calendar day (RRRR-MM-DD, business zone) read when the dialog was opened.
  today: string;
};

export function GoalFormFields({ form, today }: GoalFormFieldsProps) {
  const { values, errors, refs, setField } = form;

  // Destructured on purpose: after ref={…}, react-hooks/refs reports every later refs.* read.
  const {
    name: nameRef,
    targetAmount: targetAmountRef,
    targetDate: targetDateRef,
  } = refs;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-muted">Pola oznaczone * są wymagane.</p>
      <FormInput
        ref={nameRef}
        label="Nazwa celu *"
        name="name"
        autoComplete="off"
        maxLength={GOAL_NAME_MAX_LENGTH}
        placeholder="np. Wakacje we Włoszech"
        value={values.name}
        onChange={(event) => setField("name", event.target.value)}
        error={errors.name}
      />
      <FormInput
        ref={targetAmountRef}
        label="Kwota docelowa (PLN) *"
        name="targetAmount"
        inputMode="decimal"
        autoComplete="off"
        maxLength={GOAL_AMOUNT_INPUT_MAX_LENGTH}
        value={values.targetAmount}
        onChange={(event) => setField("targetAmount", event.target.value)}
        error={errors.targetAmount}
      />
      <FormInput
        ref={targetDateRef}
        label="Termin realizacji celu *"
        name="targetDate"
        type="date"
        min={getTomorrowIso(today)}
        max={MAX_TARGET_DATE}
        value={values.targetDate}
        onChange={(event) => setField("targetDate", event.target.value)}
        error={errors.targetDate}
      />
    </div>
  );
}
