import { DashboardSection } from "@/components/dashboard/DashboardSection";

type MonthlyBalanceCardProps = {
  months: number;
};

export function MonthlyBalanceCard({ months }: MonthlyBalanceCardProps) {
  return (
    <DashboardSection title="Przychody i wydatki">
      <p className="flex min-h-72 items-center justify-center rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-muted">
        Wykres w przygotowaniu. Liczba miesięcy: {months}.
      </p>
    </DashboardSection>
  );
}
