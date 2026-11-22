import { ProgressBar } from "@/components/ui/ProgressBar";
import { BUDGET_STATUS_PRESENTATION } from "@/lib/budgets/status";
import { formatPercent, formatPln } from "@/lib/format/money";
import type { BudgetUsageResponse } from "@/types/api";

// The API percentage is already on a 0-100 scale; no amount is recalculated here.
const PERCENTAGE_SCALE_MAX = 100;

type BudgetPreviewRowProps = {
  usage: BudgetUsageResponse;
};

export function BudgetPreviewRow({ usage }: BudgetPreviewRowProps) {
  const { categoryName, limitAmount, spentAmount, percentage, status } = usage;
  const presentation = BUDGET_STATUS_PRESENTATION[status];
  const spent = formatPln(spentAmount);
  const limit = formatPln(limitAmount);
  const percent = formatPercent(percentage);

  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <p
          title={categoryName}
          className="min-w-0 truncate text-sm font-medium text-ink"
        >
          {categoryName}
        </p>
        <p className="shrink-0 text-sm text-muted">{`${spent} / ${limit}`}</p>
      </div>
      <ProgressBar
        label={`Wykorzystanie limitu: ${categoryName}`}
        value={percentage}
        max={PERCENTAGE_SCALE_MAX}
        tone={presentation.tone}
        valueText={`${spent} z ${limit}, ${percent}, ${presentation.spokenLabel}`}
      />
      <p className={`text-xs font-medium ${presentation.textClass}`}>
        {`${percent} · ${presentation.label}`}
      </p>
    </li>
  );
}
