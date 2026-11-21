import { type RefObject, useRef } from "react";
import { type DialogFormState, useDialogForm } from "@/hooks/useDialogForm";
import {
  createEmptyGoalValues,
  GOAL_FORM_FIELDS,
  type GoalFormField,
  mapGoalServerErrors,
  parseGoalForm,
} from "@/lib/goals/goalForm";
import type { SavingsGoalRequest } from "@/types/api";

type GoalFormRefs = {
  readonly [Field in GoalFormField]: RefObject<HTMLInputElement | null>;
};

type UseGoalFormOptions = {
  // Calendar day (RRRR-MM-DD, business zone) read when the dialog was opened.
  today: string;
  onSubmit: (request: SavingsGoalRequest) => Promise<void>;
};

export type GoalFormState = DialogFormState<GoalFormField> & {
  readonly refs: GoalFormRefs;
};

export function useGoalForm({
  today,
  onSubmit,
}: UseGoalFormOptions): GoalFormState {
  const nameRef = useRef<HTMLInputElement>(null);
  const targetAmountRef = useRef<HTMLInputElement>(null);
  const targetDateRef = useRef<HTMLInputElement>(null);
  const refs: GoalFormRefs = {
    name: nameRef,
    targetAmount: targetAmountRef,
    targetDate: targetDateRef,
  };
  const form = useDialogForm({
    initialValues: createEmptyGoalValues(),
    fields: GOAL_FORM_FIELDS,
    refs,
    parse: (values) => parseGoalForm(values, today),
    mapServerErrors: mapGoalServerErrors,
    onSubmit,
  });

  return { ...form, refs };
}
