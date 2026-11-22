import { CategoryIcon } from "@/components/icons/CategoryIcon";
import { TransactionAmount } from "@/components/transactions/TransactionAmount";
import { formatIsoDate } from "@/lib/format/date";
import { getTransactionTitle } from "@/lib/format/transactionTitle";
import type { TransactionResponse } from "@/types/api";

type RecentTransactionRowProps = {
  transaction: TransactionResponse;
};

export function RecentTransactionRow({
  transaction,
}: RecentTransactionRowProps) {
  const title = getTransactionTitle(transaction);

  return (
    <li className="flex items-center gap-3 py-3">
      <CategoryIcon
        name={transaction.categoryIcon}
        className="shrink-0 text-lg text-muted"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p title={title} className="truncate text-sm font-medium text-ink">
          {title}
        </p>
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>{formatIsoDate(transaction.date)}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-ink">
            {transaction.categoryName}
          </span>
        </p>
      </div>
      <div className="shrink-0 text-right text-sm">
        <TransactionAmount transaction={transaction} />
      </div>
    </li>
  );
}
