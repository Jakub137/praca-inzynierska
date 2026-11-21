import { BUDGET_STATUS_PRESENTATION } from "@/lib/budgets/status";
import type { BudgetStatus } from "@/types/api";

const MIN_PERCENT = 0;
const MAX_PERCENT = 100;

type BudgetProgressBarProps = {
  // Accessible name, e.g. "Wykorzystanie limitu: Rozrywka".
  label: string;
  // From the API; can exceed 100.
  percentage: number;
  status: BudgetStatus;
  // Full text read by screen readers, e.g. "689,00 zł z 1 500,00 zł, 76%, ostrzeżenie".
  valueText: string;
};

// The bar and aria-valuenow stop at 100 even when the limit is exceeded.
function clampPercentage(value: number): number {
  return Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, value));
}

export function BudgetProgressBar({
  label,
  percentage,
  status,
  valueText,
}: BudgetProgressBarProps) {
  const filled = clampPercentage(percentage);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={filled}
      aria-valuemin={MIN_PERCENT}
      aria-valuemax={MAX_PERCENT}
      aria-valuetext={valueText}
      className="h-2 w-full overflow-hidden rounded-full bg-line"
    >
      <div
        className={`h-full rounded-full ${BUDGET_STATUS_PRESENTATION[status].barClass}`}
        style={{ width: `${filled}%` }}
      />
    </div>
  );
}
