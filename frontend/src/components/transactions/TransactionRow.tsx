import { CategoryIcon } from "@/components/icons/CategoryIcon";
import { TransactionAmount } from "@/components/transactions/TransactionAmount";
import { TransactionRowActions } from "@/components/transactions/TransactionRowActions";
import { formatIsoDate } from "@/lib/format/date";
import { getTransactionTitle } from "@/lib/format/transactionTitle";
import type { TransactionResponse } from "@/types/api";

type TransactionRowProps = {
  transaction: TransactionResponse;
};

export function TransactionRow({ transaction }: TransactionRowProps) {
  const title = getTransactionTitle(transaction);

  return (
    <tr className="border-t border-line">
      <td className="whitespace-nowrap px-4 py-3 text-muted">
        {formatIsoDate(transaction.date)}
      </td>
      <td className="px-4 py-3">
        <span className="flex max-w-64 items-center gap-2">
          <CategoryIcon
            name={transaction.categoryIcon}
            className="shrink-0 text-lg text-muted"
          />
          <span title={title} className="min-w-0 truncate font-medium text-ink">
            {title}
          </span>
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="inline-block whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-ink">
          {transaction.categoryName}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right">
        <TransactionAmount transaction={transaction} />
      </td>
      <td className="px-4 py-1 text-right">
        <TransactionRowActions transaction={transaction} />
      </td>
    </tr>
  );
}
