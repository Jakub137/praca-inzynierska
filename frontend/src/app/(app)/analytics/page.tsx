import type { Metadata } from "next";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import { parseAnalyticsMonths } from "@/lib/analytics/period";
import type { RawSearchParams } from "@/lib/transactions/filters";

export const metadata: Metadata = {
  title: "Analityka i Raporty",
};

type AnalyticsPageProps = {
  searchParams: Promise<RawSearchParams>;
};

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const { months } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">Analityka i Raporty</h1>
      <AnalyticsView months={parseAnalyticsMonths(months)} />
    </div>
  );
}
