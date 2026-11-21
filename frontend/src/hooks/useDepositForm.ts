import { type RefObject, useRef } from "react";
import { type DialogFormState, useDialogForm } from "@/hooks/useDialogForm";
import {
  createEmptyDepositValues,
  DEPOSIT_FORM_FIELDS,
  type DepositFormField,
  mapDepositServerErrors,
  parseDepositForm,
} from "@/lib/goals/depositForm";
import type { DepositToGoalRequest } from "@/types/api";

type DepositFormRefs = {
  readonly [Field in DepositFormField]: RefObject<HTMLInputElement | null>;
};

type UseDepositFormOptions = {
  onSubmit: (request: DepositToGoalRequest) => Promise<void>;
};

export type DepositFormState = DialogFormState<DepositFormField> & {
  readonly refs: DepositFormRefs;
};

export function useDepositForm({
  onSubmit,
}: UseDepositFormOptions): DepositFormState {
  const amountRef = useRef<HTMLInputElement>(null);
  const refs: DepositFormRefs = { amount: amountRef };
  const form = useDialogForm({
    initialValues: createEmptyDepositValues(),
    fields: DEPOSIT_FORM_FIELDS,
    refs,
    parse: parseDepositForm,
    mapServerErrors: mapDepositServerErrors,
    onSubmit,
  });

  return { ...form, refs };
}
