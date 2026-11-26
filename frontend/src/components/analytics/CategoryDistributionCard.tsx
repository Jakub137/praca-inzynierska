"use client";

import Link from "next/link";
import { CategoryDistributionChart } from "@/components/analytics/CategoryDistributionChart";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { WidgetSkeleton } from "@/components/dashboard/WidgetSkeleton";
import { BarChartIcon } from "@/components/icons/BarChartIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { RetryError } from "@/components/ui/RetryError";
import {
  type CategoryDistributionState,
  useCategoryDistribution,
} from "@/hooks/useCategoryDistribution";
import { PRIMARY_ACTION } from "@/lib/buttonStyles";

const TITLE = "Wydatki według kategorii";
// At least as tall as the balance card in every state, so both cards line up.
const CHART_AREA = "flex min-h-84 flex-col justify-center";
const SKELETON_ROWS = 5;

type DistributionContentProps = {
  state: Exclude<CategoryDistributionState, { status: "idle" }>;
  onRetry: () => void;
};

function DistributionContent({ state, onRetry }: DistributionContentProps) {
  if (state.status === "loading") {
    return (
      <WidgetSkeleton label="rozkładu wydatków" rowCount={SKELETON_ROWS} />
    );
  }
  if (state.status === "error") {
    return (
      <RetryError
        message="Nie udało się wczytać rozkładu wydatków."
        onRetry={onRetry}
      />
    );
  }
  if (state.distribution.categories.length === 0) {
    return (
      <EmptyState
        icon={<BarChartIcon />}
        title="Brak wydatków w tym okresie"
        description="Dodaj wydatek, aby zobaczyć rozkład kategorii."
        actionButton={
          <Link href="/transactions" className={PRIMARY_ACTION}>
            Przejdź do transakcji
          </Link>
        }
      />
    );
  }
  return <CategoryDistributionChart distribution={state.distribution} />;
}

type CategoryDistributionCardProps = {
  months: number;
};

export function CategoryDistributionCard({
  months,
}: CategoryDistributionCardProps) {
  const { state, retry } = useCategoryDistribution(months);

  if (state.status === "idle") {
    return null;
  }
  return (
    <DashboardSection title={TITLE}>
      <div className={CHART_AREA}>
        <DistributionContent state={state} onRetry={retry} />
      </div>
    </DashboardSection>
  );
}
