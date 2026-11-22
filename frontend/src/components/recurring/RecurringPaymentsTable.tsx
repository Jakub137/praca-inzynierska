import { RecurringPaymentRow } from "@/components/recurring/RecurringPaymentRow";
import { FOCUS_RING } from "@/lib/focusRing";
import type { RecurringPaymentResponse } from "@/types/api";

const HEADER_CELL =
  "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted";

type RecurringPaymentsTableProps = {
  payments: readonly RecurringPaymentResponse[];
  // Calendar day "RRRR-MM-DD" (business zone) read when the payments arrived.
  today: string;
};

// The order is the one from the API (nearest due date first): the table does not sort.
export function RecurringPaymentsTable({
  payments,
  today,
}: RecurringPaymentsTableProps) {
  return (
    <div
      role="region"
      aria-label="Lista płatności cyklicznych"
      tabIndex={0}
      className={`overflow-x-auto rounded-lg border border-line bg-card ${FOCUS_RING}`}
    >
      <table className="w-full min-w-160 text-left text-sm">
        <caption className="sr-only">
          Płatności cykliczne posortowane według terminu następnej płatności
        </caption>
        <thead>
          <tr>
            <th scope="col" className={HEADER_CELL}>
              Nazwa
            </th>
            <th scope="col" className={HEADER_CELL}>
              Kategoria
            </th>
            <th scope="col" className={HEADER_CELL}>
              Cykl
            </th>
            <th scope="col" className={HEADER_CELL}>
              Następna płatność
            </th>
            <th scope="col" className={`${HEADER_CELL} text-right`}>
              Kwota
            </th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <RecurringPaymentRow
              key={payment.id}
              payment={payment}
              today={today}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
