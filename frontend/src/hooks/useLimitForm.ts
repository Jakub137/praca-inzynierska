import { type RefObject, useRef } from "react";
import { type DialogFormState, useDialogForm } from "@/hooks/useDialogForm";
import {
  LIMIT_FORM_FIELDS,
  type LimitFormField,
  type LimitFormValues,
  mapServerFieldErrors,
  parseLimitForm,
} from "@/lib/budgets/limitForm";
import type { BudgetPeriod } from "@/lib/budgets/period";
import type { SetBudgetLimitRequest } from "@/types/api";

type LimitFormRefs = {
  readonly categoryId: RefObject<HTMLSelectElement | null>;
  readonly limitAmount: RefObject<HTMLInputElement | null>;
};

type UseLimitFormOptions = {
  initialValues: LimitFormValues;
  // The categories the user may pick: one id in edit mode, the free expense categories in create mode.
  allowedCategoryIds: readonly number[];
  period: BudgetPeriod;
  // Rejects with the failure; its user message is shown in the dialog.
  onSubmit: (request: SetBudgetLimitRequest) => Promise<void>;
};

export type LimitFormState = DialogFormState<LimitFormField> & {
  readonly refs: LimitFormRefs;
};

export function useLimitForm({
  initialValues,
  allowedCategoryIds,
  period,
  onSubmit,
}: UseLimitFormOptions): LimitFormState {
  const categoryIdRef = useRef<HTMLSelectElement>(null);
  const limitAmountRef = useRef<HTMLInputElement>(null);
  const refs: LimitFormRefs = {
    categoryId: categoryIdRef,
    limitAmount: limitAmountRef,
  };
  const form = useDialogForm({
    initialValues,
    fields: LIMIT_FORM_FIELDS,
    refs,
    parse: (values) => parseLimitForm(values, allowedCategoryIds, period),
    mapServerErrors: mapServerFieldErrors,
    onSubmit,
  });

  return { ...form, refs };
}
