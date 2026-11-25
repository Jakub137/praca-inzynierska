import type { Metadata } from "next";
import { BudgetsView } from "@/components/budgets/BudgetsView";
import {
  parseCategoryId,
  parseMonth,
  type RawSearchParams,
} from "@/lib/transactions/filters";
import { buildMonthOptions } from "@/lib/transactions/months";

export const metadata: Metadata = {
  title: "Budżet i Limity",
};

type BudgetsPageProps = {
  searchParams: Promise<RawSearchParams>;
};

export default async function BudgetsPage({ searchParams }: BudgetsPageProps) {
  // The only place that reads the clock: the month list and the address validation share it.
  const monthOptions = buildMonthOptions(new Date());
  const { month, edit } = await searchParams;
  // An invalid month is treated like a missing one: the backend then picks the current month.
  const validMonth = parseMonth(
    month,
    monthOptions.map((option) => option.value),
  );
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">Budżet i Limity</h1>
      <BudgetsView
        month={validMonth}
        monthOptions={monthOptions}
        // An invalid or missing "?edit=" is treated like none: nothing opens.
        editCategoryId={parseCategoryId(edit)}
      />
    </div>
  );
}
