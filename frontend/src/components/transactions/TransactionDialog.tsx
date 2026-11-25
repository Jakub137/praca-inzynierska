"use client";

import type { RefObject } from "react";
import {
  type CategoriesStatus,
  TransactionFormFields,
} from "@/components/transactions/TransactionFormFields";
import { FormDialogFrame } from "@/components/ui/FormDialogFrame";
import { type CategoriesState, useCategories } from "@/hooks/useCategories";
import { useCategorySuggestion } from "@/hooks/useCategorySuggestion";
import { useCurrencyRates } from "@/hooks/useCurrencyRates";
import { useTransactionForm } from "@/hooks/useTransactionForm";
import type { TransactionFormValues } from "@/lib/transactions/transactionForm";
import type {
  CategoryResponse,
  CreateTransactionRequest,
  CurrencyRateResponse,
  TransactionResponse,
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
  // Edit mode: the saved transaction; its rate decides the hint under the amount.
  savedTransaction?: TransactionResponse;
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
): string {
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
  savedTransaction,
}: TransactionDialogProps) {
  const categoriesState = useCategories();
  const ratesState = useCurrencyRates();
  const categories =
    categoriesState.status === "ready"
      ? categoriesState.categories
      : NO_CATEGORIES;
  const rates = ratesState.status === "ready" ? ratesState.rates : NO_RATES;
  const form = useTransactionForm({ initialValues, categories, onSubmit });
  // Only a new transaction gets a suggestion; the suggested category is set like any other change.
  const suggestion = useCategorySuggestion({
    enabled: mode === "create",
    description: form.values.description,
    amount: form.values.amount,
    type: form.selectedType,
    categoryId: form.values.categoryId,
    categories,
    onSuggested: (categoryId) => form.setField("categoryId", categoryId),
  });
  const texts = DIALOG_TEXTS[mode];

  return (
    <FormDialogFrame
      title={texts.title}
      description={texts.description}
      submitLabel={getSubmitLabel(mode, form.selectedType)}
      canSubmit={categoriesState.status === "ready"}
      form={form}
      onClose={onClose}
      initialFocusRef={form.refs.amount}
      returnFocusRef={returnFocusRef}
    >
      <TransactionFormFields
        form={form}
        categories={categories}
        categoriesStatus={toCategoriesStatus(categoriesState)}
        rates={rates}
        savedTransaction={savedTransaction}
        suggestion={suggestion.current}
        onCategoryPicked={suggestion.markManualChoice}
      />
    </FormDialogFrame>
  );
}
