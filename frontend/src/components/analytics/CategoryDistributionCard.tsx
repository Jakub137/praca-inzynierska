import { DashboardSection } from "@/components/dashboard/DashboardSection";

type CategoryDistributionCardProps = {
  months: number;
};

export function CategoryDistributionCard({
  months,
}: CategoryDistributionCardProps) {
  return (
    <DashboardSection title="Wydatki według kategorii">
      <p className="flex min-h-72 items-center justify-center rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-muted">
        Wykres w przygotowaniu. Liczba miesięcy: {months}.
      </p>
    </DashboardSection>
  );
}
