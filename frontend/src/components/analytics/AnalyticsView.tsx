import { AnalyticsPeriodSelect } from "@/components/analytics/AnalyticsPeriodSelect";
import { CategoryDistributionCard } from "@/components/analytics/CategoryDistributionCard";
import { MonthlyBalanceCard } from "@/components/analytics/MonthlyBalanceCard";
import type { AnalyticsMonths } from "@/lib/analytics/period";

type AnalyticsViewProps = {
  months: AnalyticsMonths;
};

// The cards get only the number of months: each chart loads its own data.
export function AnalyticsView({ months }: AnalyticsViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <AnalyticsPeriodSelect months={months} />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <MonthlyBalanceCard months={months} />
        <CategoryDistributionCard months={months} />
      </div>
    </div>
  );
}
