import { BudgetProgressBar } from "@/components/budgets/BudgetProgressBar";
import { AlertCircleIcon } from "@/components/icons/AlertCircleIcon";
import { CheckIcon } from "@/components/icons/CheckIcon";
import { BUDGET_STATUS_PRESENTATION } from "@/lib/budgets/status";
import { formatPercent, formatPln } from "@/lib/format/money";
import type { BudgetUsageResponse } from "@/types/api";

type BudgetCardProps = {
  usage: BudgetUsageResponse;
};

export function BudgetCard({ usage }: BudgetCardProps) {
  const { categoryName, limitAmount, spentAmount, percentage, status } = usage;
  const presentation = BUDGET_STATUS_PRESENTATION[status];
  const StatusIcon = status === "NORMAL" ? CheckIcon : AlertCircleIcon;
  const spent = formatPln(spentAmount);
  const limit = formatPln(limitAmount);
  const percent = formatPercent(percentage);

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-line bg-card p-4">
      <h2
        title={categoryName}
        className="truncate text-base font-semibold text-ink"
      >
        {categoryName}
      </h2>
      <p className="text-sm text-muted">{`${spent} / ${limit} (${percent})`}</p>
      <BudgetProgressBar
        label={`Wykorzystanie limitu: ${categoryName}`}
        percentage={percentage}
        status={status}
        valueText={`${spent} z ${limit}, ${percent}, ${presentation.spokenLabel}`}
      />
      <p
        className={`flex items-center gap-1 text-sm font-medium ${presentation.textClass}`}
      >
        <StatusIcon className="size-4 shrink-0" />
        {presentation.label}
      </p>
    </article>
  );
}
