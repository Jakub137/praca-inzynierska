import { MetricCard } from "@/components/dashboard/MetricCard";
import { MetricCardSkeleton } from "@/components/dashboard/MetricCardSkeleton";
import { RetryError } from "@/components/ui/RetryError";
import type { DashboardSummaryState } from "@/hooks/useDashboardSummary";
import { formatPln, formatSignedPercent } from "@/lib/format/money";

type SummaryMetricCardsProps = {
  state: DashboardSummaryState;
  onRetry: () => void;
};

// The sign is written in the text too, so the change never relies on colour alone.
function getChangeClass(percent: number): string {
  if (percent > 0) {
    return "text-success";
  }
  if (percent < 0) {
    return "text-danger";
  }
  return "text-muted";
}

// The three cards share one request, so they share one loading state and one error.
export function SummaryMetricCards({
  state,
  onRetry,
}: SummaryMetricCardsProps) {
  if (state.status === "idle") {
    return null;
  }
  if (state.status === "loading") {
    return (
      <>
        <MetricCardSkeleton label="Dostępne środki" />
        <MetricCardSkeleton label="Wydatki w tym miesiącu" />
        <MetricCardSkeleton label="Przychody w tym miesiącu" />
      </>
    );
  }
  if (state.status === "error") {
    return (
      <div className="sm:col-span-2 xl:col-span-3">
        <RetryError
          message="Nie udało się wczytać podsumowania."
          onRetry={onRetry}
        />
      </div>
    );
  }
  const { summary } = state;
  const { availableFundsChangePercent, monthLimitTotal } = summary;

  return (
    <>
      <MetricCard
        label="Dostępne środki"
        value={formatPln(summary.availableFunds)}
      >
        {availableFundsChangePercent !== null && (
          <p
            className={`text-sm font-medium ${getChangeClass(availableFundsChangePercent)}`}
          >
            {`${formatSignedPercent(availableFundsChangePercent)} vs poprz. mies.`}
          </p>
        )}
      </MetricCard>
      <MetricCard
        label="Wydatki w tym miesiącu"
        value={formatPln(summary.monthExpenses)}
      >
        {monthLimitTotal !== null && (
          <p className="text-sm text-muted">
            {`z ${formatPln(monthLimitTotal)} limitu ogólnego`}
          </p>
        )}
      </MetricCard>
      <MetricCard
        label="Przychody w tym miesiącu"
        value={formatPln(summary.monthIncome)}
      />
    </>
  );
}
