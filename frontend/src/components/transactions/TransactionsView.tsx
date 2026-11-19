"use client";

import { TransferIcon } from "@/components/icons/TransferIcon";
import { TransactionsSkeleton } from "@/components/transactions/TransactionsSkeleton";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTransactions } from "@/hooks/useTransactions";
import { FOCUS_RING } from "@/lib/focusRing";

type TransactionsErrorProps = {
  onRetry: () => void;
};

function TransactionsError({ onRetry }: TransactionsErrorProps) {
  return (
    <div className="flex max-w-md flex-col items-start gap-3">
      <Alert variant="error">Nie udało się wczytać transakcji.</Alert>
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

export function TransactionsView() {
  const { state, retry } = useTransactions();

  if (state.status === "idle") {
    return null;
  }
  if (state.status === "loading") {
    return <TransactionsSkeleton />;
  }
  if (state.status === "error") {
    return <TransactionsError onRetry={retry} />;
  }
  if (state.page.totalElements === 0) {
    return (
      <EmptyState
        icon={<TransferIcon />}
        title="Brak transakcji"
        description="Gdy dodasz pierwszą transakcję, pojawi się tutaj."
      />
    );
  }
  return <TransactionsTable transactions={state.page.content} />;
}
