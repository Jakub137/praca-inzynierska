import { CheckIcon } from "@/components/icons/CheckIcon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { FOCUS_RING } from "@/lib/focusRing";
import { formatPercent, formatPln } from "@/lib/format/money";
import { buildDeadlineText } from "@/lib/goals/deadline";
import { buildProgressHint } from "@/lib/goals/hint";
import { calculateProgressPercent } from "@/lib/goals/progress";
import type { SavingsGoalResponse } from "@/types/api";

// The percentage can exceed 100 after an overpayment; the bar clamps it.
const PERCENTAGE_SCALE_MAX = 100;

const DEPOSIT_LABEL = "+ Wpłać kwotę";

// The clicked button is passed on so that the dialog can return the focus to it.
export type GoalDepositHandler = (
  goal: SavingsGoalResponse,
  opener: HTMLElement,
) => void;

type GoalCardProps = {
  goal: SavingsGoalResponse;
  // Calendar day "RRRR-MM-DD" used to tell a passed deadline from one within a month.
  today: string;
  onDeposit?: GoalDepositHandler;
};

export function GoalCard({ goal, today, onDeposit }: GoalCardProps) {
  const { name, targetAmount, currentAmount, status } = goal;
  const isCompleted = status === "COMPLETED";
  const percent = calculateProgressPercent(currentAmount, targetAmount);
  const current = formatPln(currentAmount);
  const target = formatPln(targetAmount);
  const progressText = `${current} z ${target}, ${formatPercent(percent)}`;

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-line bg-card p-4">
      <h2 title={name} className="truncate text-base font-semibold text-ink">
        {name}
      </h2>
      <p className="text-sm text-muted">{buildDeadlineText(goal, today)}</p>
      <p className="text-sm font-medium text-ink">{`${current} / ${target}`}</p>
      <ProgressBar
        label={`Postęp celu: ${name}`}
        value={percent}
        max={PERCENTAGE_SCALE_MAX}
        tone="brand"
        valueText={
          isCompleted ? `${progressText}, cel osiągnięty` : progressText
        }
      />
      {isCompleted && (
        <p className="flex items-center gap-1 text-sm font-medium text-success">
          <CheckIcon className="size-4 shrink-0" />
          Cel osiągnięty
        </p>
      )}
      <p className="text-sm text-muted">{buildProgressHint(goal, percent)}</p>
      {onDeposit !== undefined && (
        <button
          type="button"
          aria-label={`Wpłać kwotę: ${name}`}
          data-edit-for={goal.id}
          onClick={(event) => onDeposit(goal, event.currentTarget)}
          className={`min-h-11 self-start rounded-lg border border-slate-300 px-4 text-sm font-medium text-ink hover:bg-slate-100 ${FOCUS_RING}`}
        >
          {DEPOSIT_LABEL}
        </button>
      )}
    </article>
  );
}
