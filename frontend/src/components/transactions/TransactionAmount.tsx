import { formatForeignAmount, formatSignedPln } from "@/lib/format/money";
import type { TransactionResponse } from "@/types/api";

const AMOUNT_COLORS = {
  INCOME: "text-success",
  EXPENSE: "text-danger",
} as const;

type TransactionAmountProps = {
  transaction: TransactionResponse;
};

export function TransactionAmount({ transaction }: TransactionAmountProps) {
  const { amount, amountPln, currency, type } = transaction;

  return (
    <>
      <span className={`block font-semibold ${AMOUNT_COLORS[type]}`}>
        {formatSignedPln(amountPln, type)}
      </span>
      {currency === "PLN" ? null : (
        <span className="block text-xs text-muted">
          ({formatForeignAmount(amount, currency)})
        </span>
      )}
    </>
  );
}
