import { type FormEvent, type RefObject, useRef, useState } from "react";
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

type UseTransactionFormOptions = {
  initialValues: TransactionFormValues;
  categories: readonly CategoryResponse[];
  onSubmit?: (request: CreateTransactionRequest) => void;
};

export type TransactionFormState = {
  readonly values: TransactionFormValues;
  readonly errors: TransactionFormErrors;
  readonly selectedType: TransactionType;
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

  // Editing a field removes its message; the others stay until the next submit.
  function setField<Field extends keyof TransactionFormValues>(
    field: Field,
    value: TransactionFormValues[Field],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => withoutError(current, field));
  }

  function focusField(field: TransactionFormField) {
    refs[field].current?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    onSubmit?.(result.request);
  }

  return {
    values,
    errors,
    selectedType: getSelectedType(values.categoryId, categories),
    refs,
    setField,
    handleSubmit,
  };
}
