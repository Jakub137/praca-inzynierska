import { useId } from "react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import {
  BalanceLegend,
  EXPENSE_LABEL,
  EXPENSE_MARK,
  INCOME_LABEL,
  INCOME_MARK,
} from "@/components/analytics/balanceSeries";
import { BalanceTable } from "@/components/analytics/BalanceTable";
import { BalanceTooltip } from "@/components/analytics/BalanceTooltip";
import { MarkPatternDef, markFill } from "@/components/analytics/chartMarks";
import {
  buildChartLabel,
  formatAxisAmount,
  formatShortMonth,
} from "@/lib/analytics/balanceChart";
import type { MonthlyBalanceResponse } from "@/types/api";

const AXIS_TICK = { fill: "var(--color-muted)" };

// Recharts makes the SVG focusable; these classes draw the project's focus outline around it.
const PLOT_CLASS =
  "min-h-0 flex-1 text-xs [&_.recharts-surface:focus-visible]:outline-2 [&_.recharts-surface:focus-visible]:outline-offset-2 [&_.recharts-surface:focus-visible]:outline-brand";

type MonthlyBalanceChartProps = {
  // At least one month.
  rows: readonly MonthlyBalanceResponse[];
};

export function MonthlyBalanceChart({ rows }: MonthlyBalanceChartProps) {
  const patternId = useId();

  return (
    // The fixed height gives the responsive chart a size to fill.
    <div className="flex h-84 flex-col gap-3">
      <BalanceLegend />
      <div className={PLOT_CLASS}>
        {/* "responsive" follows the size of the parent; accessibilityLayer stays on by default. */}
        <BarChart
          data={[...rows]}
          responsive
          style={{ width: "100%", height: "100%" }}
          aria-label={buildChartLabel(rows)}
        >
          <defs>
            <MarkPatternDef id={patternId} mark={EXPENSE_MARK} />
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-line)" />
          <XAxis
            dataKey="month"
            tickFormatter={formatShortMonth}
            tick={AXIS_TICK}
          />
          <YAxis
            width="auto"
            tickFormatter={formatAxisAmount}
            tick={AXIS_TICK}
          />
          <Tooltip
            cursor={{ fill: "var(--color-line)" }}
            content={({ active, label }) => (
              <BalanceTooltip active={active} month={label} rows={rows} />
            )}
          />
          <Bar dataKey="income" name={INCOME_LABEL} fill={INCOME_MARK.color} />
          <Bar
            dataKey="expenses"
            name={EXPENSE_LABEL}
            fill={markFill(EXPENSE_MARK, patternId)}
          />
        </BarChart>
      </div>
      <BalanceTable rows={rows} />
    </div>
  );
}
