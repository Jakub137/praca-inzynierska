import Link from "next/link";
import { DashboardLink } from "@/components/dashboard/DashboardLink";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { RecentTransactionRow } from "@/components/dashboard/RecentTransactionRow";
import { WidgetSkeleton } from "@/components/dashboard/WidgetSkeleton";
import { TransferIcon } from "@/components/icons/TransferIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { RetryError } from "@/components/ui/RetryError";
import {
  RECENT_TRANSACTIONS_COUNT,
  type RecentTransactionsState,
} from "@/hooks/useRecentTransactions";
import { PRIMARY_ACTION } from "@/lib/buttonStyles";

const TITLE = "Ostatnie Transakcje";
const TRANSACTIONS_PATH = "/transactions";

type RecentTransactionsCardProps = {
  state: RecentTransactionsState;
  onRetry: () => void;
};

export function RecentTransactionsCard({
  state,
  onRetry,
}: RecentTransactionsCardProps) {
  if (state.status === "idle") {
    return null;
  }
  if (state.status === "loading") {
    return (
      <DashboardSection title={TITLE}>
        <WidgetSkeleton
          label="ostatnich transakcji"
          rowCount={RECENT_TRANSACTIONS_COUNT}
        />
      </DashboardSection>
    );
  }
  if (state.status === "error") {
    return (
      <DashboardSection title={TITLE}>
        <RetryError
          message="Nie udało się wczytać transakcji."
          onRetry={onRetry}
        />
      </DashboardSection>
    );
  }
  const { content, totalElements } = state.page;
  if (content.length === 0) {
    return (
      <DashboardSection title={TITLE}>
        <EmptyState
          icon={<TransferIcon />}
          title="Brak transakcji"
          description="Nie dodano jeszcze żadnej transakcji."
          actionButton={
            <Link href={TRANSACTIONS_PATH} className={PRIMARY_ACTION}>
              Przejdź do transakcji
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
        <DashboardLink href={TRANSACTIONS_PATH}>
          {`Wszystkie (${totalElements}) →`}
        </DashboardLink>
      }
    >
      <ul className="divide-y divide-line">
        {content.map((transaction) => (
          <RecentTransactionRow
            key={transaction.id}
            transaction={transaction}
          />
        ))}
      </ul>
    </DashboardSection>
  );
}
