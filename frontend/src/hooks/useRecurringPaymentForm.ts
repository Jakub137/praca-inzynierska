import { type RefObject, useRef } from "react";
import { type DialogFormState, useDialogForm } from "@/hooks/useDialogForm";
import {
  createEmptyRecurringValues,
  mapRecurringServerErrors,
  parseRecurringForm,
  RECURRING_FORM_FIELDS,
  type RecurringFormField,
} from "@/lib/recurring/recurringForm";
import type { RecurringPaymentRequest } from "@/types/api";

type RecurringFormRefs = {
  readonly name: RefObject<HTMLInputElement | null>;
  readonly amount: RefObject<HTMLInputElement | null>;
  readonly currency: RefObject<HTMLSelectElement | null>;
  readonly categoryId: RefObject<HTMLSelectElement | null>;
  readonly frequency: RefObject<HTMLSelectElement | null>;
  readonly nextDueDate: RefObject<HTMLInputElement | null>;
};

type UseRecurringPaymentFormOptions = {
  // Calendar day (RRRR-MM-DD, business zone) read when the dialog was opened.
  today: string;
  onSubmit: (request: RecurringPaymentRequest) => Promise<void>;
};

export type RecurringPaymentFormState = DialogFormState<RecurringFormField> & {
  readonly refs: RecurringFormRefs;
};

export function useRecurringPaymentForm({
  today,
  onSubmit,
}: UseRecurringPaymentFormOptions): RecurringPaymentFormState {
  const nameRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const currencyRef = useRef<HTMLSelectElement>(null);
  const categoryIdRef = useRef<HTMLSelectElement>(null);
  const frequencyRef = useRef<HTMLSelectElement>(null);
  const nextDueDateRef = useRef<HTMLInputElement>(null);
  const refs: RecurringFormRefs = {
    name: nameRef,
    amount: amountRef,
    currency: currencyRef,
    categoryId: categoryIdRef,
    frequency: frequencyRef,
    nextDueDate: nextDueDateRef,
  };
  const form = useDialogForm({
    initialValues: createEmptyRecurringValues(),
    fields: RECURRING_FORM_FIELDS,
    refs,
    parse: (values) => parseRecurringForm(values, today),
    mapServerErrors: mapRecurringServerErrors,
    onSubmit,
  });

  return { ...form, refs };
}
