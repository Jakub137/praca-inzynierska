"use client";

import Link from "next/link";
import { type MouseEvent, useRef, useState } from "react";
import { TransferIcon } from "@/components/icons/TransferIcon";
import { TransactionDialog } from "@/components/transactions/TransactionDialog";
import { TransactionsFilters } from "@/components/transactions/TransactionsFilters";
import { TransactionsPagination } from "@/components/transactions/TransactionsPagination";
import { TransactionsSkeleton } from "@/components/transactions/TransactionsSkeleton";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCreateTransaction } from "@/hooks/useCreateTransaction";
import {
  type TransactionsState,
  useTransactions,
} from "@/hooks/useTransactions";
import { FOCUS_RING } from "@/lib/focusRing";
import {
  buildTransactionsHref,
  DEFAULT_TRANSACTION_FILTERS,
  FIRST_PAGE,
  hasActiveFilters,
  type TransactionFilters,
} from "@/lib/transactions/filters";
import type { MonthOption } from "@/lib/transactions/months";
import {
  createEmptyFormValues,
  toLocalIsoDate,
  type TransactionFormValues,
} from "@/lib/transactions/transactionForm";

const PRIMARY_ACTION = `inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-medium text-white hover:underline ${FOCUS_RING}`;

type TransactionsViewProps = {
  filters: TransactionFilters;
  monthOptions: readonly MonthOption[];
};

type ActiveState = Exclude<TransactionsState, { readonly status: "idle" }>;

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

type NoResultsProps = {
  filters: TransactionFilters;
  // True when the requested page lies beyond the last page of the results.
  isPageOutOfRange: boolean;
};

function NoResults({ filters, isPageOutOfRange }: NoResultsProps) {
  const content = isPageOutOfRange
    ? {
        title: "Nie ma takiej strony wyników",
        description: "Lista ma mniej stron. Wróć do pierwszej strony.",
        href: buildTransactionsHref({ ...filters, page: FIRST_PAGE }),
        label: "Przejdź do pierwszej strony",
      }
    : {
        title: "Brak transakcji dla wybranych filtrów",
        description: "Zmień filtry lub wróć do pełnej listy.",
        href: buildTransactionsHref(DEFAULT_TRANSACTION_FILTERS),
        label: "Wyczyść filtry",
      };
  return (
    <EmptyState
      icon={<TransferIcon />}
      title={content.title}
      description={content.description}
      actionButton={
        <Link href={content.href} className={PRIMARY_ACTION}>
          {content.label}
        </Link>
      }
    />
  );
}

type TransactionsResultsProps = {
  state: ActiveState;
  filters: TransactionFilters;
  onRetry: () => void;
};

function TransactionsResults({
  state,
  filters,
  onRetry,
}: TransactionsResultsProps) {
  if (state.status === "loading") {
    return <TransactionsSkeleton />;
  }
  if (state.status === "error") {
    return <TransactionsError onRetry={onRetry} />;
  }
  const { page } = state;
  if (page.content.length === 0) {
    if (page.totalElements === 0 && !hasActiveFilters(filters)) {
      return (
        <EmptyState
          icon={<TransferIcon />}
          title="Brak transakcji"
          description="Gdy dodasz pierwszą transakcję, pojawi się tutaj."
        />
      );
    }
    return (
      <NoResults filters={filters} isPageOutOfRange={page.totalElements > 0} />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <TransactionsTable transactions={page.content} />
      <TransactionsPagination filters={filters} result={page} />
    </div>
  );
}

export function TransactionsView({
  filters,
  monthOptions,
}: TransactionsViewProps) {
  const { state, retry } = useTransactions(filters);
  const openerRef = useRef<HTMLElement | null>(null);
  const [draft, setDraft] = useState<TransactionFormValues | null>(null);
  // Order matters: close the dialog, reload the list (filters and page stay), then the hook shows the toast.
  const submitTransaction = useCreateTransaction({
    onCreated: () => {
      setDraft(null);
      retry();
    },
  });

  // The date is read here, not while rendering, so that a render stays pure.
  function openDialog(event: MouseEvent<HTMLButtonElement>) {
    openerRef.current = event.currentTarget;
    setDraft(createEmptyFormValues(toLocalIsoDate(new Date())));
  }

  if (state.status === "idle") {
    return null;
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button type="button" onClick={openDialog} className={PRIMARY_ACTION}>
          + Dodaj wydatek
        </button>
      </div>
      <TransactionsFilters filters={filters} monthOptions={monthOptions} />
      <TransactionsResults state={state} filters={filters} onRetry={retry} />
      {draft !== null && (
        <TransactionDialog
          mode="create"
          initialValues={draft}
          returnFocusRef={openerRef}
          onClose={() => setDraft(null)}
          onSubmit={submitTransaction}
        />
      )}
    </div>
  );
}
