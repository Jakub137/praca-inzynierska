"use client";

import {
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
} from "react";
import {
  LimitFormFields,
  type LimitCategoryField,
} from "@/components/budgets/LimitFormFields";
import type { CategoriesStatus } from "@/components/transactions/TransactionFormFields";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { type CategoriesState, useCategories } from "@/hooks/useCategories";
import { type LimitFormState, useLimitForm } from "@/hooks/useLimitForm";
import {
  createEmptyLimitValues,
  getAssignableCategories,
  toLimitFormValues,
} from "@/lib/budgets/limitForm";
import type { BudgetPeriod } from "@/lib/budgets/period";
import { FOCUS_RING } from "@/lib/focusRing";
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

const SAVING_LABEL = "Zapisywanie…";
const NO_CATEGORIES: readonly CategoryResponse[] = [];

const SECONDARY_BUTTON = `min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium text-ink hover:bg-slate-100 ${FOCUS_RING}`;

function toCategoriesStatus(state: CategoriesState): CategoriesStatus {
  if (state.status === "ready" || state.status === "error") {
    return state.status;
  }
  return "loading";
}

type LimitDialogFrameProps = {
  title: string;
  description: string;
  submitLabel: string;
  canSubmit: boolean;
  form: LimitFormState;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
};

function LimitDialogFrame({
  title,
  description,
  submitLabel,
  canSubmit,
  form,
  onClose,
  returnFocusRef,
  children,
}: LimitDialogFrameProps) {
  const formId = useId();
  const alertRef = useRef<HTMLDivElement>(null);
  const { submitError } = form;

  // After a failed request the focus moves to the message: it scrolls into view on a low screen
  // and the focus does not stay on the button that was just disabled.
  useEffect(() => {
    if (submitError !== null) {
      alertRef.current?.focus();
    }
  }, [submitError]);

  const footer = (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
        Anuluj
      </button>
      <button
        type="submit"
        form={formId}
        disabled={!canSubmit || form.isSubmitting}
        className={`min-h-11 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:underline disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
      >
        {form.isSubmitting ? SAVING_LABEL : submitLabel}
      </button>
    </div>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      description={description}
      initialFocusRef={form.refs.limitAmount}
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
        {children}
      </form>
    </Modal>
  );
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
          <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
            Zamknij
          </button>
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
    <LimitDialogFrame
      title={CREATE_TEXTS.title}
      description={CREATE_TEXTS.description}
      submitLabel="Zapisz limit"
      canSubmit={status === "ready"}
      form={form}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
    >
      <LimitFormFields
        form={form}
        periodLabel={periodLabel}
        category={category}
      />
    </LimitDialogFrame>
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
    <LimitDialogFrame
      title={EDIT_TEXTS.title}
      description={EDIT_TEXTS.description}
      submitLabel="Zapisz zmiany"
      canSubmit
      form={form}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
    >
      <LimitFormFields
        form={form}
        periodLabel={periodLabel}
        category={{ kind: "locked", name: limit.categoryName }}
      />
    </LimitDialogFrame>
  );
}

export function LimitDialog(props: LimitDialogProps) {
  if (props.mode === "create") {
    return <CreateLimitDialog {...props} />;
  }
  return <EditLimitDialog {...props} />;
}
