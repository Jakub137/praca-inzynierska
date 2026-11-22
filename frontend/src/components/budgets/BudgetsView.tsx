"use client";

import { useRef, useState } from "react";
import {
  BudgetCard,
  type BudgetEditHandler,
} from "@/components/budgets/BudgetCard";
import { BudgetMonthSelect } from "@/components/budgets/BudgetMonthSelect";
import { BudgetsSkeleton } from "@/components/budgets/BudgetsSkeleton";
import { LimitDialog } from "@/components/budgets/LimitDialog";
import { WalletIcon } from "@/components/icons/WalletIcon";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RetryError } from "@/components/ui/RetryError";
import { type BudgetUsageState, useBudgetUsage } from "@/hooks/useBudgetUsage";
import { useEditFocusRestore } from "@/hooks/useEditFocusRestore";
import { useSetBudgetLimit } from "@/hooks/useSetBudgetLimit";
import { monthToBudgetPeriod } from "@/lib/budgets/period";
import type { MonthOption } from "@/lib/transactions/months";
import type { BudgetUsageResponse } from "@/types/api";

const NO_CATEGORY_IDS: readonly number[] = [];

type BudgetsViewProps = {
  // "RRRR-MM" from the address, or null for the current month.
  month: string | null;
  monthOptions: readonly MonthOption[];
};

type ActiveState = Exclude<BudgetUsageState, { readonly status: "idle" }>;

type LimitDialogState =
  | { readonly mode: "create" }
  | { readonly mode: "edit"; readonly limit: BudgetUsageResponse };

type BudgetsResultsProps = {
  state: ActiveState;
  onRetry: () => void;
  onEdit: BudgetEditHandler;
};

function BudgetsResults({ state, onRetry, onEdit }: BudgetsResultsProps) {
  if (state.status === "loading") {
    return <BudgetsSkeleton />;
  }
  if (state.status === "error") {
    return (
      <RetryError message="Nie udało się wczytać limitów." onRetry={onRetry} />
    );
  }
  if (state.usage.length === 0) {
    return (
      <EmptyState
        icon={<WalletIcon />}
        title="Brak limitów w tym miesiącu"
        description="Dla wybranego miesiąca nie ustawiono jeszcze żadnego limitu."
      />
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {state.usage.map((usage) => (
        <li key={usage.categoryId} className="min-w-0">
          <BudgetCard usage={usage} onEdit={onEdit} />
        </li>
      ))}
    </ul>
  );
}

export function BudgetsView({ month, monthOptions }: BudgetsViewProps) {
  const { state, retry } = useBudgetUsage(month);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const editOpenerRef = useRef<HTMLElement | null>(null);
  const [dialog, setDialog] = useState<LimitDialogState | null>(null);
  // After a saved edit the usage reloads and the cards are rebuilt: the focus goes back to the same card.
  const requestEditFocus = useEditFocusRestore(state, addButtonRef);
  // No month in the address means the first option of the list (the current month).
  const selectedMonth = month ?? monthOptions[0].value;
  const period = monthToBudgetPeriod(selectedMonth);
  const periodLabel =
    monthOptions.find((option) => option.value === selectedMonth)?.label ??
    selectedMonth;
  // While the usage loads or failed nothing is known about existing limits; saving then updates one (200).
  const takenCategoryIds =
    state.status === "ready"
      ? state.usage.map((usage) => usage.categoryId)
      : NO_CATEGORY_IDS;

  // Order matters: remember the card for the focus, close the dialog, reload the usage, then the hook
  // shows the toast. A new limit needs no focus request: the add button stays on the page.
  const saveLimit = useSetBudgetLimit({
    onSaved: (request) => {
      if (dialog?.mode === "edit") {
        requestEditFocus(String(request.categoryId));
      }
      setDialog(null);
      retry();
    },
  });

  const openEditDialog: BudgetEditHandler = (limit, opener) => {
    editOpenerRef.current = opener;
    setDialog({ mode: "edit", limit });
  };

  if (state.status === "idle") {
    return null;
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <BudgetMonthSelect month={month} monthOptions={monthOptions} />
        <Button
          ref={addButtonRef}
          onClick={() => setDialog({ mode: "create" })}
        >
          + Nowy limit
        </Button>
      </div>
      <BudgetsResults state={state} onRetry={retry} onEdit={openEditDialog} />
      {dialog?.mode === "create" && (
        <LimitDialog
          mode="create"
          period={period}
          periodLabel={periodLabel}
          takenCategoryIds={takenCategoryIds}
          returnFocusRef={addButtonRef}
          onClose={() => setDialog(null)}
          onSubmit={saveLimit}
        />
      )}
      {dialog?.mode === "edit" && (
        <LimitDialog
          key={dialog.limit.categoryId}
          mode="edit"
          period={period}
          periodLabel={periodLabel}
          limit={dialog.limit}
          returnFocusRef={editOpenerRef}
          onClose={() => setDialog(null)}
          onSubmit={saveLimit}
        />
      )}
    </div>
  );
}
