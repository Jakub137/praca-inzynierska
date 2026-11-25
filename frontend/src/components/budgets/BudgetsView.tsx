"use client";

import { useRouter } from "next/navigation";
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
import { buildBudgetsHref, monthToBudgetPeriod } from "@/lib/budgets/period";
import type { MonthOption } from "@/lib/transactions/months";
import type { BudgetUsageResponse } from "@/types/api";

const NO_CATEGORY_IDS: readonly number[] = [];

type BudgetsViewProps = {
  // "RRRR-MM" from the address, or null for the current month.
  month: string | null;
  monthOptions: readonly MonthOption[];
  // Category id from "?edit=" (the dashboard banner), or null when the address has none.
  editCategoryId: number | null;
};

type ActiveState = Exclude<BudgetUsageState, { readonly status: "idle" }>;

type LimitDialogState =
  // categoryId: the category chosen at opening; set only by "?edit=".
  | { readonly mode: "create"; readonly categoryId?: number }
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

// "?edit=" (the dashboard banner) opens the dialog of that category once the usage is known: edit when
// the category has a limit in the shown month, otherwise a new limit with the category chosen.
function resolveRequestedDialog(
  state: BudgetUsageState,
  editCategoryId: number | null,
  handledEditId: number | null,
): LimitDialogState | null {
  if (
    editCategoryId === null ||
    editCategoryId === handledEditId ||
    state.status !== "ready"
  ) {
    return null;
  }
  const limit = state.usage.find(
    (usage) => usage.categoryId === editCategoryId,
  );
  return limit === undefined
    ? { mode: "create", categoryId: editCategoryId }
    : { mode: "edit", limit };
}

export function BudgetsView({
  month,
  monthOptions,
  editCategoryId,
}: BudgetsViewProps) {
  const router = useRouter();
  const { state, retry } = useBudgetUsage(month);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const editOpenerRef = useRef<HTMLElement | null>(null);
  const [dialog, setDialog] = useState<LimitDialogState | null>(null);
  // The address keeps "?edit=" until the router has replaced it; the handled id keeps the dialog from reopening meanwhile.
  const [handledEditId, setHandledEditId] = useState<number | null>(null);
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
  // A dialog opened by a button wins over the one requested by the address.
  const activeDialog =
    dialog ?? resolveRequestedDialog(state, editCategoryId, handledEditId);
  // A dialog opened by the address has no opener button: the focus goes back to the add button.
  const editReturnFocusRef = dialog === null ? addButtonRef : editOpenerRef;

  // Closing removes "?edit=", so a reload or Back does not open the dialog again.
  function closeDialog() {
    setDialog(null);
    if (editCategoryId === null) {
      return;
    }
    setHandledEditId(editCategoryId);
    router.replace(buildBudgetsHref(month), { scroll: false });
  }

  // Order matters: remember the card for the focus, close the dialog, reload the usage, then the hook
  // shows the toast. A new limit needs no focus request: the add button stays on the page.
  const saveLimit = useSetBudgetLimit({
    onSaved: (request) => {
      if (activeDialog?.mode === "edit") {
        requestEditFocus(String(request.categoryId));
      }
      closeDialog();
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
      {activeDialog?.mode === "create" && (
        <LimitDialog
          mode="create"
          period={period}
          periodLabel={periodLabel}
          takenCategoryIds={takenCategoryIds}
          initialCategoryId={activeDialog.categoryId}
          returnFocusRef={addButtonRef}
          onClose={closeDialog}
          onSubmit={saveLimit}
        />
      )}
      {activeDialog?.mode === "edit" && (
        <LimitDialog
          key={activeDialog.limit.categoryId}
          mode="edit"
          period={period}
          periodLabel={periodLabel}
          limit={activeDialog.limit}
          returnFocusRef={editReturnFocusRef}
          onClose={closeDialog}
          onSubmit={saveLimit}
        />
      )}
    </div>
  );
}
