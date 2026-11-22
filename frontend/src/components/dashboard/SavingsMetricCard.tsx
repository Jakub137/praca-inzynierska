import { DashboardLink } from "@/components/dashboard/DashboardLink";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { MetricCardSkeleton } from "@/components/dashboard/MetricCardSkeleton";
import { RetryError } from "@/components/ui/RetryError";
import type { SavingsGoalsState } from "@/hooks/useSavingsGoals";
import { selectPrimaryGoal } from "@/lib/dashboard/primaryGoal";
import { formatPercent, formatPln } from "@/lib/format/money";
import { calculateProgressPercent } from "@/lib/goals/progress";

const LABEL = "Odłożone na cele";

type SavingsMetricCardProps = {
  state: SavingsGoalsState;
  onRetry: () => void;
};

// The card shows the primary goal, not a sum of all goals: the backend sums nothing for goals.
export function SavingsMetricCard({ state, onRetry }: SavingsMetricCardProps) {
  if (state.status === "idle") {
    return null;
  }
  if (state.status === "loading") {
    return <MetricCardSkeleton label={LABEL} />;
  }
  if (state.status === "error") {
    return (
      <div>
        <RetryError message="Nie udało się wczytać celów." onRetry={onRetry} />
      </div>
    );
  }
  const goal = selectPrimaryGoal(state.goals);
  if (goal === undefined) {
    return (
      <MetricCard label={LABEL} value="Brak celu">
        <DashboardLink href="/goals">Przejdź do celów</DashboardLink>
      </MetricCard>
    );
  }
  const percent = calculateProgressPercent(
    goal.currentAmount,
    goal.targetAmount,
  );
  const caption = `${formatPercent(percent)} celu: ${goal.name}`;

  return (
    <MetricCard label={LABEL} value={formatPln(goal.currentAmount)}>
      <p title={caption} className="truncate text-sm text-muted">
        {caption}
      </p>
    </MetricCard>
  );
}
