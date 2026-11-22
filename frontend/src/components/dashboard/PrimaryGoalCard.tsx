import Link from "next/link";
import { DashboardLink } from "@/components/dashboard/DashboardLink";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { WidgetSkeleton } from "@/components/dashboard/WidgetSkeleton";
import { CheckIcon } from "@/components/icons/CheckIcon";
import { TargetIcon } from "@/components/icons/TargetIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RetryError } from "@/components/ui/RetryError";
import type { SavingsGoalsState } from "@/hooks/useSavingsGoals";
import { PRIMARY_ACTION } from "@/lib/buttonStyles";
import { selectPrimaryGoal } from "@/lib/dashboard/primaryGoal";
import { formatPercent, formatPln } from "@/lib/format/money";
import { buildDeadlineText } from "@/lib/goals/deadline";
import { buildProgressHint } from "@/lib/goals/hint";
import { calculateProgressPercent } from "@/lib/goals/progress";
import type { SavingsGoalResponse } from "@/types/api";

const TITLE = "Główny Cel Oszczędnościowy";
const GOALS_PATH = "/goals";
const SKELETON_ROW_COUNT = 3;

// The percentage can exceed 100 after an overpayment; the bar clamps it.
const PERCENTAGE_SCALE_MAX = 100;

type PrimaryGoalCardProps = {
  state: SavingsGoalsState;
  onRetry: () => void;
};

type PrimaryGoalProps = {
  goal: SavingsGoalResponse;
  // Calendar day "RRRR-MM-DD" used to tell a passed deadline from one within a month.
  today: string;
};

function PrimaryGoal({ goal, today }: PrimaryGoalProps) {
  const { name, targetAmount, currentAmount, status } = goal;
  const isCompleted = status === "COMPLETED";
  const percent = calculateProgressPercent(currentAmount, targetAmount);
  const amounts = `${formatPln(currentAmount)} z ${formatPln(targetAmount)}`;
  const progressText = `${amounts}, ${formatPercent(percent)}`;

  return (
    <div className="flex flex-col gap-3">
      <h3 title={name} className="truncate text-base font-semibold text-ink">
        {name}
      </h3>
      <p className="text-sm text-muted">{buildDeadlineText(goal, today)}</p>
      <p className="text-sm font-medium text-ink">{amounts}</p>
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
    </div>
  );
}

// The goal comes from the list the goals page uses, shared with the "Odłożone na cele" card (one request).
export function PrimaryGoalCard({ state, onRetry }: PrimaryGoalCardProps) {
  if (state.status === "idle") {
    return null;
  }
  if (state.status === "loading") {
    return (
      <DashboardSection title={TITLE}>
        <WidgetSkeleton label="głównego celu" rowCount={SKELETON_ROW_COUNT} />
      </DashboardSection>
    );
  }
  if (state.status === "error") {
    return (
      <DashboardSection title={TITLE}>
        <RetryError message="Nie udało się wczytać celów." onRetry={onRetry} />
      </DashboardSection>
    );
  }
  const goal = selectPrimaryGoal(state.goals);
  if (goal === undefined) {
    return (
      <DashboardSection title={TITLE}>
        <EmptyState
          icon={<TargetIcon />}
          title="Brak celów oszczędnościowych"
          description="Nie masz jeszcze żadnego celu oszczędnościowego."
          actionButton={
            <Link href={GOALS_PATH} className={PRIMARY_ACTION}>
              Przejdź do celów
            </Link>
          }
        />
      </DashboardSection>
    );
  }
  return (
    <DashboardSection
      title={TITLE}
      action={<DashboardLink href={GOALS_PATH}>Wszystkie cele →</DashboardLink>}
    >
      <PrimaryGoal goal={goal} today={state.today} />
    </DashboardSection>
  );
}
