"use client";

import { type RefObject, useId } from "react";
import {
  type CategoriesStatus,
  TransactionFormFields,
} from "@/components/transactions/TransactionFormFields";
import { Modal } from "@/components/ui/Modal";
import { type CategoriesState, useCategories } from "@/hooks/useCategories";
import { useTransactionForm } from "@/hooks/useTransactionForm";
import { FOCUS_RING } from "@/lib/focusRing";
import type { TransactionFormValues } from "@/lib/transactions/transactionForm";
import type {
  CategoryResponse,
  CreateTransactionRequest,
  TransactionType,
} from "@/types/api";

export type TransactionDialogMode = "create" | "edit";

export type TransactionDialogProps = {
  mode: TransactionDialogMode;
  initialValues: TransactionFormValues;
  onClose: () => void;
  // Called with the validated request; without it the form only validates (T-048 connects the POST).
  onSubmit?: (request: CreateTransactionRequest) => void;
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

const NO_CATEGORIES: readonly CategoryResponse[] = [];

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
}: TransactionDialogProps) {
  const formId = useId();
  const categoriesState = useCategories();
  const categories =
    categoriesState.status === "ready"
      ? categoriesState.categories
      : NO_CATEGORIES;
  const form = useTransactionForm({ initialValues, categories, onSubmit });
  const canSubmit = categoriesState.status === "ready";
  const texts = DIALOG_TEXTS[mode];

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
        {getSubmitLabel(mode, form.selectedType)}
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
      <form id={formId} noValidate onSubmit={form.handleSubmit}>
        <TransactionFormFields
          form={form}
          categories={categories}
          categoriesStatus={toCategoriesStatus(categoriesState)}
        />
      </form>
    </Modal>
  );
}
