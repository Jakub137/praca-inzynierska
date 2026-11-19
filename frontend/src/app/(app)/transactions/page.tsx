import type { Metadata } from "next";
import { TransactionsView } from "@/components/transactions/TransactionsView";

export const metadata: Metadata = {
  title: "Transakcje",
};

export default function TransactionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">Transakcje</h1>
      <TransactionsView />
    </div>
  );
}
