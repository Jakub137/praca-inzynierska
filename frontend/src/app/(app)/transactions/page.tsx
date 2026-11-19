import type { Metadata } from "next";
import { TransactionsView } from "@/components/transactions/TransactionsView";
import {
  parseTransactionFilters,
  type RawSearchParams,
} from "@/lib/transactions/filters";
import { buildMonthOptions } from "@/lib/transactions/months";

export const metadata: Metadata = {
  title: "Transakcje",
};

type TransactionsPageProps = {
  searchParams: Promise<RawSearchParams>;
};

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  // The only place that reads the clock: the month list and the address validation share it.
  const monthOptions = buildMonthOptions(new Date());
  const filters = parseTransactionFilters(
    await searchParams,
    monthOptions.map((option) => option.value),
  );
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">Transakcje</h1>
      <TransactionsView filters={filters} monthOptions={monthOptions} />
    </div>
  );
}
