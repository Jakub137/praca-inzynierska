import { TransactionRow } from "@/components/transactions/TransactionRow";
import type { TransactionDeleteHandler } from "@/components/transactions/TransactionRowActions";
import { FOCUS_RING } from "@/lib/focusRing";
import type { TransactionResponse } from "@/types/api";

const HEADER_CELL =
  "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted";

type TransactionsTableProps = {
  transactions: readonly TransactionResponse[];
  onDelete?: TransactionDeleteHandler;
};

export function TransactionsTable({
  transactions,
  onDelete,
}: TransactionsTableProps) {
  return (
    <div
      role="region"
      aria-label="Lista transakcji"
      tabIndex={0}
      className={`overflow-x-auto rounded-lg border border-line bg-card ${FOCUS_RING}`}
    >
      <table className="w-full min-w-160 text-left text-sm">
        <caption className="sr-only">
          Transakcje posortowane od najnowszej
        </caption>
        <thead>
          <tr>
            <th scope="col" className={HEADER_CELL}>
              Data
            </th>
            <th scope="col" className={HEADER_CELL}>
              Opis
            </th>
            <th scope="col" className={HEADER_CELL}>
              Kategoria
            </th>
            <th scope="col" className={`${HEADER_CELL} text-right`}>
              Kwota
            </th>
            <th scope="col" className={`${HEADER_CELL} text-right`}>
              Akcje
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
