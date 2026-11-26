import {
  EXPENSE_LABEL,
  INCOME_LABEL,
} from "@/components/analytics/balanceSeries";
import { formatPln } from "@/lib/format/money";
import { formatMonthName } from "@/lib/transactions/months";
import type { MonthlyBalanceResponse } from "@/types/api";

type BalanceTooltipProps = {
  active: boolean;
  // The X-axis value of the pointed column; Recharts does not narrow its type.
  month: unknown;
  rows: readonly MonthlyBalanceResponse[];
};

export function BalanceTooltip({ active, month, rows }: BalanceTooltipProps) {
  const row = active ? rows.find((item) => item.month === month) : undefined;

  // The live region stays in the DOM: a region inserted together with its text may not be announced.
  return (
    <div role="status" aria-live="assertive">
      {row !== undefined && (
        <div className="rounded-lg border border-line bg-card p-3 text-sm whitespace-nowrap text-ink shadow-md">
          <p className="font-semibold">{formatMonthName(row.month)}</p>
          <p>{`${INCOME_LABEL}: ${formatPln(row.income)}`}</p>
          <p>{`${EXPENSE_LABEL}: ${formatPln(row.expenses)}`}</p>
        </div>
      )}
    </div>
  );
}
