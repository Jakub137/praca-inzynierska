import { type FormEvent, type RefObject, useRef, useState } from "react";
import { ApiError, getUserMessage } from "@/lib/api/errors";
import {
  LIMIT_FORM_FIELDS,
  type LimitFormErrors,
  type LimitFormField,
  type LimitFormValues,
  mapServerFieldErrors,
  parseLimitForm,
} from "@/lib/budgets/limitForm";
import type { BudgetPeriod } from "@/lib/budgets/period";
import type { SetBudgetLimitRequest } from "@/types/api";

const HTTP_BAD_REQUEST = 400;

type LimitFormRefs = {
  readonly categoryId: RefObject<HTMLSelectElement | null>;
  readonly limitAmount: RefObject<HTMLInputElement | null>;
};

// Rejects with the failure; its user message is shown in the dialog.
type SubmitHandler = (request: SetBudgetLimitRequest) => Promise<void>;

type UseLimitFormOptions = {
  initialValues: LimitFormValues;
  // The categories the user may pick: one id in edit mode, the free expense categories in create mode.
  allowedCategoryIds: readonly number[];
  period: BudgetPeriod;
  onSubmit: SubmitHandler;
};

export type LimitFormState = {
  readonly values: LimitFormValues;
  readonly errors: LimitFormErrors;
  readonly isSubmitting: boolean;
  // Message of the last failed request that is not tied to a field; null when there is none.
  readonly submitError: string | null;
  readonly refs: LimitFormRefs;
  readonly setField: (field: LimitFormField, value: string) => void;
  readonly handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function withoutError(
  errors: LimitFormErrors,
  field: LimitFormField,
): LimitFormErrors {
  return Object.fromEntries(
    Object.entries(errors).filter(([key]) => key !== field),
  );
}

export function useLimitForm({
  initialValues,
  allowedCategoryIds,
  period,
  onSubmit,
}: UseLimitFormOptions): LimitFormState {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<LimitFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // The state drives the button; the ref also blocks a second submit event that arrives before the re-render.
  const isSendingRef = useRef(false);
  const categoryIdRef = useRef<HTMLSelectElement>(null);
  const limitAmountRef = useRef<HTMLInputElement>(null);
  const refs: LimitFormRefs = {
    categoryId: categoryIdRef,
    limitAmount: limitAmountRef,
  };

  // Editing a field removes its message and the failure message; the other field messages stay until the next submit.
  function setField(field: LimitFormField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => withoutError(current, field));
    setSubmitError(null);
  }

  function focusField(field: LimitFormField) {
    refs[field].current?.focus();
  }

  // 400 with errors of our fields goes to the fields; every other failure (404, 409, 5xx, network) to the dialog.
  function showFailure(error: unknown) {
    const serverErrors: LimitFormErrors =
      error instanceof ApiError && error.status === HTTP_BAD_REQUEST
        ? mapServerFieldErrors(error.problem?.fieldErrors)
        : {};
    const firstInvalid = LIMIT_FORM_FIELDS.find(
      (field) => serverErrors[field] !== undefined,
    );
    if (firstInvalid === undefined) {
      setSubmitError(getUserMessage(error));
      return;
    }
    setErrors(serverErrors);
    focusField(firstInvalid);
  }

  async function send(request: SetBudgetLimitRequest) {
    isSendingRef.current = true;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(request);
    } catch (error) {
      showFailure(error);
    } finally {
      isSendingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSendingRef.current) {
      return;
    }
    const result = parseLimitForm(values, allowedCategoryIds, period);
    if (result.status === "invalid") {
      setErrors(result.errors);
      const firstInvalid = LIMIT_FORM_FIELDS.find(
        (field) => result.errors[field] !== undefined,
      );
      if (firstInvalid !== undefined) {
        focusField(firstInvalid);
      }
      return;
    }
    setErrors({});
    void send(result.request);
  }

  return {
    values,
    errors,
    isSubmitting,
    submitError,
    refs,
    setField,
    handleSubmit,
  };
}
