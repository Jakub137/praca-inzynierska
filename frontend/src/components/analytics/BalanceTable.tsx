import {
  EXPENSE_LABEL,
  INCOME_LABEL,
} from "@/components/analytics/balanceSeries";
import { formatPln } from "@/lib/format/money";
import { formatMonthName } from "@/lib/transactions/months";
import type { MonthlyBalanceResponse } from "@/types/api";

type BalanceTableProps = {
  rows: readonly MonthlyBalanceResponse[];
};

// Text alternative of the chart, visible only to screen readers.
// The wrapper is hidden, because a table ignores the 1px size of "sr-only".
export function BalanceTable({ rows }: BalanceTableProps) {
  return (
    <div className="sr-only">
      <table>
        <caption>Przychody i wydatki w kolejnych miesiącach</caption>
        <thead>
          <tr>
            <th scope="col">Miesiąc</th>
            <th scope="col">{INCOME_LABEL}</th>
            <th scope="col">{EXPENSE_LABEL}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.month}>
              <th scope="row">{formatMonthName(row.month)}</th>
              <td>{formatPln(row.income)}</td>
              <td>{formatPln(row.expenses)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
