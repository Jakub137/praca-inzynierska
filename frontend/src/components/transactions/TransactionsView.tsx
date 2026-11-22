"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent, useEffect, useRef, useState } from "react";
import { TransferIcon } from "@/components/icons/TransferIcon";
import { DeleteTransactionDialog } from "@/components/transactions/DeleteTransactionDialog";
import { TransactionDialog } from "@/components/transactions/TransactionDialog";
import type {
  TransactionDeleteHandler,
  TransactionEditHandler,
} from "@/components/transactions/TransactionRowActions";
import { TransactionsFilters } from "@/components/transactions/TransactionsFilters";
import { TransactionsPagination } from "@/components/transactions/TransactionsPagination";
import { TransactionsSkeleton } from "@/components/transactions/TransactionsSkeleton";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RetryError } from "@/components/ui/RetryError";
import { useCreateTransaction } from "@/hooks/useCreateTransaction";
import { useDeleteTransaction } from "@/hooks/useDeleteTransaction";
import { useEditFocusRestore } from "@/hooks/useEditFocusRestore";
import {
  type TransactionsState,
  useTransactions,
} from "@/hooks/useTransactions";
import { useUpdateTransaction } from "@/hooks/useUpdateTransaction";
import { PRIMARY_ACTION } from "@/lib/buttonStyles";
import { getFiltersAfterDelete } from "@/lib/transactions/deleteNavigation";
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
  toFormValues,
  toLocalIsoDate,
  type TransactionFormValues,
} from "@/lib/transactions/transactionForm";
import type { TransactionResponse } from "@/types/api";

type TransactionsViewProps = {
  filters: TransactionFilters;
  monthOptions: readonly MonthOption[];
};

type ActiveState = Exclude<TransactionsState, { readonly status: "idle" }>;

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
  onEdit: TransactionEditHandler;
  onDelete: TransactionDeleteHandler;
};

function TransactionsResults({
  state,
  filters,
  onRetry,
  onEdit,
  onDelete,
}: TransactionsResultsProps) {
  if (state.status === "loading") {
    return <TransactionsSkeleton />;
  }
  if (state.status === "error") {
    return (
      <RetryError
        message="Nie udało się wczytać transakcji."
        onRetry={onRetry}
      />
    );
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
      <TransactionsTable
        transactions={page.content}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      <TransactionsPagination filters={filters} result={page} />
    </div>
  );
}

export function TransactionsView({
  filters,
  monthOptions,
}: TransactionsViewProps) {
  const router = useRouter();
  const { state, retry } = useTransactions(filters);
  const openerRef = useRef<HTMLElement | null>(null);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const deleteOpenerRef = useRef<HTMLElement | null>(null);
  const editOpenerRef = useRef<HTMLElement | null>(null);
  // Set after a successful deletion: the trash button is gone, so the focus goes to the add button.
  const focusAddButtonRef = useRef(false);
  const [draft, setDraft] = useState<TransactionFormValues | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TransactionResponse | null>(
    null,
  );
  const [editTarget, setEditTarget] = useState<TransactionResponse | null>(
    null,
  );
  const rowsOnPage = state.status === "ready" ? state.page.content.length : 0;
  // After a saved edit the list reloads: the focus goes back to the pencil of the same row.
  const requestEditFocus = useEditFocusRestore(state, addButtonRef);
  // Order matters: close the dialog, reload the list (filters and page stay), then the hook shows the toast.
  const submitTransaction = useCreateTransaction({
    onCreated: () => {
      setDraft(null);
      retry();
    },
  });

  // A page that lost its only row would be out of range: go back one page and let the new page load
  // by itself (the page number is part of the request key); otherwise reload the current page.
  function reloadAfterDelete() {
    const previousPage = getFiltersAfterDelete(filters, rowsOnPage);
    if (previousPage === null) {
      retry();
      return;
    }
    router.replace(buildTransactionsHref(previousPage), { scroll: false });
  }

  const deleteTransaction = useDeleteTransaction({
    onDeleted: () => {
      focusAddButtonRef.current = true;
      setDeleteTarget(null);
      reloadAfterDelete();
    },
  });

  // Order matters: remember the row for the focus, close the dialog, reload the list (filters and page
  // stay), then the hook shows the toast.
  const updateTransaction = useUpdateTransaction({
    onUpdated: (id) => {
      requestEditFocus(id);
      setEditTarget(null);
      retry();
    },
  });

  // Runs after the cleanup of the closing dialog, which returns the focus to the removed trash button,
  // so this focus wins. After Anuluj, Esc or the close button the flag is false and the dialog's own return stays.
  useEffect(() => {
    if (deleteTarget !== null || !focusAddButtonRef.current) {
      return;
    }
    focusAddButtonRef.current = false;
    addButtonRef.current?.focus();
  }, [deleteTarget]);

  // The date is read here, not while rendering, so that a render stays pure.
  function openDialog(event: MouseEvent<HTMLButtonElement>) {
    openerRef.current = event.currentTarget;
    setDraft(createEmptyFormValues(toLocalIsoDate(new Date())));
  }

  const openDeleteDialog: TransactionDeleteHandler = (transaction, opener) => {
    deleteOpenerRef.current = opener;
    setDeleteTarget(transaction);
  };

  const openEditDialog: TransactionEditHandler = (transaction, opener) => {
    editOpenerRef.current = opener;
    setEditTarget(transaction);
  };

  if (state.status === "idle") {
    return null;
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button ref={addButtonRef} onClick={openDialog}>
          + Dodaj wydatek
        </Button>
      </div>
      <TransactionsFilters filters={filters} monthOptions={monthOptions} />
      <TransactionsResults
        state={state}
        filters={filters}
        onRetry={retry}
        onEdit={openEditDialog}
        onDelete={openDeleteDialog}
      />
      {draft !== null && (
        <TransactionDialog
          mode="create"
          initialValues={draft}
          returnFocusRef={openerRef}
          onClose={() => setDraft(null)}
          onSubmit={submitTransaction}
        />
      )}
      {editTarget !== null && (
        <TransactionDialog
          key={editTarget.id}
          mode="edit"
          initialValues={toFormValues(editTarget)}
          savedTransaction={editTarget}
          returnFocusRef={editOpenerRef}
          onClose={() => setEditTarget(null)}
          onSubmit={(request) => updateTransaction(editTarget.id, request)}
        />
      )}
      {deleteTarget !== null && (
        <DeleteTransactionDialog
          transaction={deleteTarget}
          returnFocusRef={deleteOpenerRef}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteTransaction(deleteTarget.id)}
        />
      )}
    </div>
  );
}
