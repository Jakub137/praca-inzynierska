import { type FormEvent, type RefObject, useRef, useState } from "react";
import { getUserMessage } from "@/lib/api/errors";
import {
  getSelectedType,
  parseTransactionForm,
  TRANSACTION_FORM_FIELDS,
  type TransactionFormErrors,
  type TransactionFormField,
  type TransactionFormValues,
} from "@/lib/transactions/transactionForm";
import type {
  CategoryResponse,
  CreateTransactionRequest,
  TransactionType,
} from "@/types/api";

type TransactionFormRefs = {
  readonly amount: RefObject<HTMLInputElement | null>;
  readonly description: RefObject<HTMLInputElement | null>;
  readonly categoryId: RefObject<HTMLSelectElement | null>;
  readonly date: RefObject<HTMLInputElement | null>;
};

// Rejects with the failure; its user message is shown in the dialog.
type SubmitHandler = (request: CreateTransactionRequest) => Promise<void>;

type UseTransactionFormOptions = {
  initialValues: TransactionFormValues;
  categories: readonly CategoryResponse[];
  onSubmit?: SubmitHandler;
};

export type TransactionFormState = {
  readonly values: TransactionFormValues;
  readonly errors: TransactionFormErrors;
  readonly selectedType: TransactionType;
  readonly isSubmitting: boolean;
  // Message of the last failed request; null when there is none.
  readonly submitError: string | null;
  readonly refs: TransactionFormRefs;
  readonly setField: <Field extends keyof TransactionFormValues>(
    field: Field,
    value: TransactionFormValues[Field],
  ) => void;
  readonly handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function withoutError(
  errors: TransactionFormErrors,
  field: keyof TransactionFormValues,
): TransactionFormErrors {
  return Object.fromEntries(
    Object.entries(errors).filter(([key]) => key !== field),
  );
}

export function useTransactionForm({
  initialValues,
  categories,
  onSubmit,
}: UseTransactionFormOptions): TransactionFormState {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<TransactionFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // The state drives the button; the ref also blocks a second submit event that arrives before the re-render.
  const isSendingRef = useRef(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const categoryIdRef = useRef<HTMLSelectElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const refs: TransactionFormRefs = {
    amount: amountRef,
    description: descriptionRef,
    categoryId: categoryIdRef,
    date: dateRef,
  };

  // Editing a field removes its message and the failure message; the other field messages stay until the next submit.
  function setField<Field extends keyof TransactionFormValues>(
    field: Field,
    value: TransactionFormValues[Field],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => withoutError(current, field));
    setSubmitError(null);
  }

  function focusField(field: TransactionFormField) {
    refs[field].current?.focus();
  }

  async function send(
    submit: SubmitHandler,
    request: CreateTransactionRequest,
  ) {
    isSendingRef.current = true;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await submit(request);
    } catch (error) {
      setSubmitError(getUserMessage(error));
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
    const result = parseTransactionForm(values, categories);
    if (result.status === "invalid") {
      setErrors(result.errors);
      const firstInvalid = TRANSACTION_FORM_FIELDS.find(
        (field) => result.errors[field] !== undefined,
      );
      if (firstInvalid !== undefined) {
        focusField(firstInvalid);
      }
      return;
    }
    setErrors({});
    if (onSubmit !== undefined) {
      void send(onSubmit, result.request);
    }
  }

  return {
    values,
    errors,
    selectedType: getSelectedType(values.categoryId, categories),
    isSubmitting,
    submitError,
    refs,
    setField,
    handleSubmit,
  };
}
