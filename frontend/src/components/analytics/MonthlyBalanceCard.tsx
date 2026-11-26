"use client";

import Link from "next/link";
import { MonthlyBalanceChart } from "@/components/analytics/MonthlyBalanceChart";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { WidgetSkeleton } from "@/components/dashboard/WidgetSkeleton";
import { BarChartIcon } from "@/components/icons/BarChartIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { RetryError } from "@/components/ui/RetryError";
import {
  type MonthlyBalanceState,
  useMonthlyBalance,
} from "@/hooks/useMonthlyBalance";
import { hasNoAmounts } from "@/lib/analytics/balanceChart";
import { PRIMARY_ACTION } from "@/lib/buttonStyles";

const TITLE = "Przychody i wydatki";
// As tall as the chart in every state, so nothing below moves when the data arrives.
const CHART_AREA = "flex min-h-84 flex-col justify-center";
const SKELETON_ROWS = 5;

type BalanceContentProps = {
  state: Exclude<MonthlyBalanceState, { status: "idle" }>;
  onRetry: () => void;
};

function BalanceContent({ state, onRetry }: BalanceContentProps) {
  if (state.status === "loading") {
    return (
      <WidgetSkeleton
        label="zestawienia miesięcznego"
        rowCount={SKELETON_ROWS}
      />
    );
  }
  if (state.status === "error") {
    return (
      <RetryError
        message="Nie udało się wczytać zestawienia miesięcznego."
        onRetry={onRetry}
      />
    );
  }
  if (hasNoAmounts(state.rows)) {
    return (
      <EmptyState
        icon={<BarChartIcon />}
        title="Brak transakcji w tym okresie"
        description="Dodaj transakcje, aby zobaczyć wykres."
        actionButton={
          <Link href="/transactions" className={PRIMARY_ACTION}>
            Przejdź do transakcji
          </Link>
        }
      />
    );
  }
  return <MonthlyBalanceChart rows={state.rows} />;
}

type MonthlyBalanceCardProps = {
  months: number;
};

export function MonthlyBalanceCard({ months }: MonthlyBalanceCardProps) {
  const { state, retry } = useMonthlyBalance(months);

  if (state.status === "idle") {
    return null;
  }
  return (
    <DashboardSection title={TITLE}>
      <div className={CHART_AREA}>
        <BalanceContent state={state} onRetry={retry} />
      </div>
    </DashboardSection>
  );
}
