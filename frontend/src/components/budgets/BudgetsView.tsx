"use client";

import { BudgetCard } from "@/components/budgets/BudgetCard";
import { BudgetMonthSelect } from "@/components/budgets/BudgetMonthSelect";
import { BudgetsSkeleton } from "@/components/budgets/BudgetsSkeleton";
import { WalletIcon } from "@/components/icons/WalletIcon";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { type BudgetUsageState, useBudgetUsage } from "@/hooks/useBudgetUsage";
import { FOCUS_RING } from "@/lib/focusRing";
import type { MonthOption } from "@/lib/transactions/months";

type BudgetsViewProps = {
  // "RRRR-MM" from the address, or null for the current month.
  month: string | null;
  monthOptions: readonly MonthOption[];
};

type ActiveState = Exclude<BudgetUsageState, { readonly status: "idle" }>;

type BudgetsErrorProps = {
  onRetry: () => void;
};

function BudgetsError({ onRetry }: BudgetsErrorProps) {
  return (
    <div className="flex max-w-md flex-col items-start gap-3">
      <Alert variant="error">Nie udało się wczytać limitów.</Alert>
      <button
        type="button"
        onClick={onRetry}
        className={`min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium text-ink hover:bg-slate-100 ${FOCUS_RING}`}
      >
        Spróbuj ponownie
      </button>
    </div>
  );
}

type BudgetsResultsProps = {
  state: ActiveState;
  onRetry: () => void;
};

function BudgetsResults({ state, onRetry }: BudgetsResultsProps) {
  if (state.status === "loading") {
    return <BudgetsSkeleton />;
  }
  if (state.status === "error") {
    return <BudgetsError onRetry={onRetry} />;
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
          <BudgetCard usage={usage} />
        </li>
      ))}
    </ul>
  );
}

export function BudgetsView({ month, monthOptions }: BudgetsViewProps) {
  const { state, retry } = useBudgetUsage(month);

  if (state.status === "idle") {
    return null;
  }
  return (
    <div className="flex flex-col gap-4">
      <BudgetMonthSelect month={month} monthOptions={monthOptions} />
      <BudgetsResults state={state} onRetry={retry} />
    </div>
  );
}
