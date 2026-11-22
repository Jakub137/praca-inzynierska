import type { Metadata } from "next";
import { RecurringPaymentsView } from "@/components/recurring/RecurringPaymentsView";

export const metadata: Metadata = {
  title: "Płatności cykliczne",
};

export default function RecurringPaymentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink">Płatności cykliczne</h1>
        <p className="text-sm text-muted">
          Zarządzaj swoimi subskrypcjami i stałymi rachunkami
        </p>
      </div>
      <RecurringPaymentsView />
    </div>
  );
}
