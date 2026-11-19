"use client";

import { type RefObject, useEffect, useId, useRef } from "react";
import {
  type CategoriesStatus,
  TransactionFormFields,
} from "@/components/transactions/TransactionFormFields";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { type CategoriesState, useCategories } from "@/hooks/useCategories";
import { useCurrencyRates } from "@/hooks/useCurrencyRates";
import { useTransactionForm } from "@/hooks/useTransactionForm";
import { FOCUS_RING } from "@/lib/focusRing";
import type { TransactionFormValues } from "@/lib/transactions/transactionForm";
import type {
  CategoryResponse,
  CreateTransactionRequest,
  CurrencyRateResponse,
  TransactionType,
} from "@/types/api";

export type TransactionDialogMode = "create" | "edit";

export type TransactionDialogProps = {
  mode: TransactionDialogMode;
  initialValues: TransactionFormValues;
  onClose: () => void;
  // Called with the validated request; without it the form only validates.
  // Rejects with the failure: the dialog stays open and shows its message.
  onSubmit?: (request: CreateTransactionRequest) => Promise<void>;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

const DIALOG_TEXTS = {
  create: {
    title: "Dodaj nową transakcję",
    description: "Wprowadź dane wydatku lub przychodu do budżetu",
  },
  edit: {
    title: "Edytuj transakcję",
    description: "Zmień dane wydatku lub przychodu",
  },
} as const;

const SAVING_LABEL = "Zapisywanie…";

const NO_CATEGORIES: readonly CategoryResponse[] = [];
const NO_RATES: readonly CurrencyRateResponse[] = [];

function toCategoriesStatus(state: CategoriesState): CategoriesStatus {
  if (state.status === "ready" || state.status === "error") {
    return state.status;
  }
  return "loading";
}

function getSubmitLabel(
  mode: TransactionDialogMode,
  type: TransactionType,
  isSubmitting: boolean,
): string {
  if (isSubmitting) {
    return SAVING_LABEL;
  }
  if (mode === "edit") {
    return "Zapisz zmiany";
  }
  return type === "INCOME" ? "Zapisz przychód" : "Zapisz wydatek";
}

export function TransactionDialog({
  mode,
  initialValues,
  onClose,
  onSubmit,
  returnFocusRef,
}: TransactionDialogProps) {
  const formId = useId();
  const alertRef = useRef<HTMLDivElement>(null);
  const categoriesState = useCategories();
  const ratesState = useCurrencyRates();
  const categories =
    categoriesState.status === "ready"
      ? categoriesState.categories
      : NO_CATEGORIES;
  const rates = ratesState.status === "ready" ? ratesState.rates : NO_RATES;
  const form = useTransactionForm({ initialValues, categories, onSubmit });
  const { submitError } = form;
  const canSubmit = categoriesState.status === "ready" && !form.isSubmitting;
  const texts = DIALOG_TEXTS[mode];

  // After a failed request the focus moves to the message: it scrolls into view on a low screen
  // and the focus does not stay on the button that was just disabled.
  useEffect(() => {
    if (submitError !== null) {
      alertRef.current?.focus();
    }
  }, [submitError]);

  const footer = (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onClose}
        className={`min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium text-ink hover:bg-slate-100 ${FOCUS_RING}`}
      >
        Anuluj
      </button>
      <button
        type="submit"
        form={formId}
        disabled={!canSubmit}
        className={`min-h-11 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:underline disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
      >
        {getSubmitLabel(mode, form.selectedType, form.isSubmitting)}
      </button>
    </div>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={texts.title}
      description={texts.description}
      initialFocusRef={form.refs.amount}
      returnFocusRef={returnFocusRef}
      footer={footer}
    >
      {submitError !== null && (
        <div className="mb-3">
          <Alert variant="error" ref={alertRef}>
            {submitError}
          </Alert>
        </div>
      )}
      <form id={formId} noValidate onSubmit={form.handleSubmit}>
        <TransactionFormFields
          form={form}
          categories={categories}
          categoriesStatus={toCategoriesStatus(categoriesState)}
          rates={rates}
        />
      </form>
    </Modal>
  );
}
