"use client";

import type { RefObject } from "react";
import {
  LimitFormFields,
  type LimitCategoryField,
} from "@/components/budgets/LimitFormFields";
import type { CategoriesStatus } from "@/components/transactions/TransactionFormFields";
import { Button } from "@/components/ui/Button";
import { FormDialogFrame } from "@/components/ui/FormDialogFrame";
import { Modal } from "@/components/ui/Modal";
import { type CategoriesState, useCategories } from "@/hooks/useCategories";
import { useLimitForm } from "@/hooks/useLimitForm";
import {
  createEmptyLimitValues,
  getAssignableCategories,
  toLimitFormValues,
} from "@/lib/budgets/limitForm";
import type { BudgetPeriod } from "@/lib/budgets/period";
import type {
  BudgetUsageResponse,
  CategoryResponse,
  SetBudgetLimitRequest,
} from "@/types/api";

type SharedProps = {
  period: BudgetPeriod;
  periodLabel: string;
  onClose: () => void;
  // Rejects with the failure: the dialog stays open and shows its message.
  onSubmit: (request: SetBudgetLimitRequest) => Promise<void>;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

type CreateProps = SharedProps & {
  mode: "create";
  // Categories that already have a limit in the shown month.
  takenCategoryIds: readonly number[];
};

type EditProps = SharedProps & {
  mode: "edit";
  limit: BudgetUsageResponse;
};

export type LimitDialogProps = CreateProps | EditProps;

const CREATE_TEXTS = {
  title: "Nowy limit",
  description: "Ustaw miesięczny limit wydatków dla wybranej kategorii",
} as const;

const EDIT_TEXTS = {
  title: "Edytuj limit",
  description: "Zmień miesięczny limit wydatków w tej kategorii",
} as const;

const ALL_TAKEN_MESSAGE =
  "Wszystkie kategorie wydatków mają już limit w tym miesiącu. Zmień istniejący limit przyciskiem Edytuj limit.";

const NO_CATEGORIES: readonly CategoryResponse[] = [];

function toCategoriesStatus(state: CategoriesState): CategoriesStatus {
  if (state.status === "ready" || state.status === "error") {
    return state.status;
  }
  return "loading";
}

type AllCategoriesTakenDialogProps = {
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

function AllCategoriesTakenDialog({
  onClose,
  returnFocusRef,
}: AllCategoriesTakenDialogProps) {
  return (
    <Modal
      open
      onClose={onClose}
      title={CREATE_TEXTS.title}
      description={CREATE_TEXTS.description}
      returnFocusRef={returnFocusRef}
      footer={
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Zamknij
          </Button>
        </div>
      }
    >
      <p className="text-sm text-ink">{ALL_TAKEN_MESSAGE}</p>
    </Modal>
  );
}

function CreateLimitDialog({
  period,
  periodLabel,
  takenCategoryIds,
  onClose,
  onSubmit,
  returnFocusRef,
}: CreateProps) {
  const categoriesState = useCategories();
  const status = toCategoriesStatus(categoriesState);
  const options =
    categoriesState.status === "ready"
      ? getAssignableCategories(categoriesState.categories, takenCategoryIds)
      : NO_CATEGORIES;
  const form = useLimitForm({
    initialValues: createEmptyLimitValues(),
    allowedCategoryIds: options.map((option) => option.id),
    period,
    onSubmit,
  });
  const category: LimitCategoryField = { kind: "select", status, options };

  if (status === "ready" && options.length === 0) {
    return (
      <AllCategoriesTakenDialog
        onClose={onClose}
        returnFocusRef={returnFocusRef}
      />
    );
  }
  return (
    <FormDialogFrame
      title={CREATE_TEXTS.title}
      description={CREATE_TEXTS.description}
      submitLabel="Zapisz limit"
      canSubmit={status === "ready"}
      form={form}
      onClose={onClose}
      initialFocusRef={form.refs.limitAmount}
      returnFocusRef={returnFocusRef}
    >
      <LimitFormFields
        form={form}
        periodLabel={periodLabel}
        category={category}
      />
    </FormDialogFrame>
  );
}

function EditLimitDialog({
  limit,
  period,
  periodLabel,
  onClose,
  onSubmit,
  returnFocusRef,
}: EditProps) {
  const form = useLimitForm({
    initialValues: toLimitFormValues(limit),
    allowedCategoryIds: [limit.categoryId],
    period,
    onSubmit,
  });

  return (
    <FormDialogFrame
      title={EDIT_TEXTS.title}
      description={EDIT_TEXTS.description}
      submitLabel="Zapisz zmiany"
      form={form}
      onClose={onClose}
      initialFocusRef={form.refs.limitAmount}
      returnFocusRef={returnFocusRef}
    >
      <LimitFormFields
        form={form}
        periodLabel={periodLabel}
        category={{ kind: "locked", name: limit.categoryName }}
      />
    </FormDialogFrame>
  );
}

export function LimitDialog(props: LimitDialogProps) {
  if (props.mode === "create") {
    return <CreateLimitDialog {...props} />;
  }
  return <EditLimitDialog {...props} />;
}
