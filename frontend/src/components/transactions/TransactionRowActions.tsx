import { PencilIcon } from "@/components/icons/PencilIcon";
import { TrashIcon } from "@/components/icons/TrashIcon";
import { FOCUS_RING } from "@/lib/focusRing";
import { formatIsoDate } from "@/lib/format/date";
import { getTransactionTitle } from "@/lib/format/transactionTitle";
import type { TransactionResponse } from "@/types/api";

const EDIT_LABEL = "Edytuj transakcję";
const DELETE_LABEL = "Usuń transakcję";

// 44x44 px target: WCAG 2.5.5 (AAA), above 24 px of 2.5.8 (AA, WCAG 2.2).
// text-muted icon is 7.58:1 on white.
const ACTION_BUTTON = `inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-slate-100 ${FOCUS_RING}`;

type TransactionRowActionsProps = {
  transaction: TransactionResponse;
  onEdit?: (transaction: TransactionResponse) => void;
  onDelete?: (transaction: TransactionResponse) => void;
};

// The accessible name starts with the visible tooltip text (label in name)
// and differs per row, so screen reader users can tell the buttons apart.
function describeRow(transaction: TransactionResponse): string {
  return `${getTransactionTitle(transaction)}, ${formatIsoDate(transaction.date)}`;
}

export function TransactionRowActions({
  transaction,
  onEdit,
  onDelete,
}: TransactionRowActionsProps) {
  const rowDescription = describeRow(transaction);

  return (
    <div className="flex justify-end gap-1">
      <button
        type="button"
        title={EDIT_LABEL}
        aria-label={`${EDIT_LABEL}: ${rowDescription}`}
        className={ACTION_BUTTON}
        onClick={() => onEdit?.(transaction)}
      >
        <PencilIcon className="size-5" />
      </button>
      <button
        type="button"
        title={DELETE_LABEL}
        aria-label={`${DELETE_LABEL}: ${rowDescription}`}
        className={ACTION_BUTTON}
        onClick={() => onDelete?.(transaction)}
      >
        <TrashIcon className="size-5" />
      </button>
    </div>
  );
}
