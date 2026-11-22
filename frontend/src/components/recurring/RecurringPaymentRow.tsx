import { FrequencyBadge } from "@/components/recurring/FrequencyBadge";
import { formatIsoDate } from "@/lib/format/date";
import { formatPaymentAmount } from "@/lib/recurring/amount";
import { buildDueInfo } from "@/lib/recurring/dueText";
import type { RecurringPaymentResponse } from "@/types/api";

type RecurringPaymentRowProps = {
  payment: RecurringPaymentResponse;
  // Calendar day "RRRR-MM-DD" (business zone) used to tell a payment past its date.
  today: string;
};

export function RecurringPaymentRow({
  payment,
  today,
}: RecurringPaymentRowProps) {
  const due = buildDueInfo(payment.nextDueDate, today);

  return (
    <tr className="border-t border-line">
      <td className="px-4 py-3">
        <span
          title={payment.name}
          className="block max-w-64 truncate font-medium text-ink"
        >
          {payment.name}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="inline-block whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-ink">
          {payment.categoryName}
        </span>
      </td>
      <td className="px-4 py-3">
        <FrequencyBadge frequency={payment.frequency} />
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <span className="flex items-baseline gap-2">
          <span className="text-ink">{formatIsoDate(payment.nextDueDate)}</span>
          {due !== null && (
            <span
              className={
                due.isOverdue ? "font-medium text-danger" : "text-muted"
              }
            >
              {due.text}
            </span>
          )}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-ink">
        {formatPaymentAmount(payment.amount, payment.currency)}
      </td>
    </tr>
  );
}
