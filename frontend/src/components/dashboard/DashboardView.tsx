"use client";

import { AiInsightBanner } from "@/components/dashboard/AiInsightBanner";
import { BudgetPreviewCard } from "@/components/dashboard/BudgetPreviewCard";
import { PrimaryGoalCard } from "@/components/dashboard/PrimaryGoalCard";
import { RecentTransactionsCard } from "@/components/dashboard/RecentTransactionsCard";
import { SavingsMetricCard } from "@/components/dashboard/SavingsMetricCard";
import { SummaryMetricCards } from "@/components/dashboard/SummaryMetricCards";
import { useBudgetUsage } from "@/hooks/useBudgetUsage";
import { useDashboardInsight } from "@/hooks/useDashboardInsight";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useRecentTransactions } from "@/hooks/useRecentTransactions";
import { useSavingsGoals } from "@/hooks/useSavingsGoals";
import { formatMonthName } from "@/lib/transactions/months";

// Every widget has its own request, loading, error and empty state: one failure leaves the others alone.
// The goals are fetched once and shared by the "Odłożone na cele" card and the primary goal widget.
export function DashboardView() {
  const summary = useDashboardSummary();
  const goals = useSavingsGoals();
  const transactions = useRecentTransactions();
  // null: the current month, picked by the backend (Europe/Warsaw).
  const budgets = useBudgetUsage(null);
  // A hint without its own skeleton or error message (see AiInsightBanner).
  const insight = useDashboardInsight();

  if (summary.state.status === "idle") {
    return null;
  }
  // The month comes from the API, so the page reads no clock of its own.
  const subtitle =
    summary.state.status === "ready"
      ? `Podsumowanie za ${formatMonthName(summary.state.summary.month)}`
      : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink">Panel Finansowy</h1>
        <div className="min-h-6">
          {subtitle !== null && <p className="text-muted">{subtitle}</p>}
        </div>
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetricCards state={summary.state} onRetry={summary.retry} />
        <SavingsMetricCard state={goals.state} onRetry={goals.retry} />
      </div>
      <AiInsightBanner state={insight.state} />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <RecentTransactionsCard
          state={transactions.state}
          onRetry={transactions.retry}
        />
        <div className="flex min-w-0 flex-col gap-6">
          <BudgetPreviewCard state={budgets.state} onRetry={budgets.retry} />
          <PrimaryGoalCard state={goals.state} onRetry={goals.retry} />
        </div>
      </div>
    </div>
  );
}
