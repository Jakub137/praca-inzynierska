import Link from "next/link";
import { BudgetPreviewRow } from "@/components/dashboard/BudgetPreviewRow";
import { DashboardLink } from "@/components/dashboard/DashboardLink";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { WidgetSkeleton } from "@/components/dashboard/WidgetSkeleton";
import { WalletIcon } from "@/components/icons/WalletIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { RetryError } from "@/components/ui/RetryError";
import type { BudgetUsageState } from "@/hooks/useBudgetUsage";
import { PRIMARY_ACTION } from "@/lib/buttonStyles";
import {
  DASHBOARD_BUDGET_COUNT,
  selectTopBudgets,
} from "@/lib/dashboard/topBudgets";

const TITLE = "Wykorzystanie Budżetu";
const BUDGETS_PATH = "/budgets";

type BudgetPreviewCardProps = {
  state: BudgetUsageState;
  onRetry: () => void;
};

export function BudgetPreviewCard({ state, onRetry }: BudgetPreviewCardProps) {
  if (state.status === "idle") {
    return null;
  }
  if (state.status === "loading") {
    return (
      <DashboardSection title={TITLE}>
        <WidgetSkeleton label="limitów" rowCount={DASHBOARD_BUDGET_COUNT} />
      </DashboardSection>
    );
  }
  if (state.status === "error") {
    return (
      <DashboardSection title={TITLE}>
        <RetryError
          message="Nie udało się wczytać limitów."
          onRetry={onRetry}
        />
      </DashboardSection>
    );
  }
  if (state.usage.length === 0) {
    return (
      <DashboardSection title={TITLE}>
        <EmptyState
          icon={<WalletIcon />}
          title="Brak limitów w tym miesiącu"
          description="Ustaw limity wydatków, aby śledzić swój budżet."
          actionButton={
            <Link href={BUDGETS_PATH} className={PRIMARY_ACTION}>
              Przejdź do limitów
            </Link>
          }
        />
      </DashboardSection>
    );
  }
  return (
    <DashboardSection
      title={TITLE}
      action={
        <DashboardLink href={BUDGETS_PATH}>Edytuj limity →</DashboardLink>
      }
    >
      <ul className="divide-y divide-line">
        {selectTopBudgets(state.usage).map((usage) => (
          <BudgetPreviewRow key={usage.categoryId} usage={usage} />
        ))}
      </ul>
    </DashboardSection>
  );
}
