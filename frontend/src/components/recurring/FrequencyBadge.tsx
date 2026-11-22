import { getFrequencyLabel } from "@/lib/recurring/frequency";
import type { PaymentFrequency } from "@/types/api";

type FrequencyBadgeProps = {
  frequency: PaymentFrequency;
};

// Text in "ink", not "brand": brand on bg-brand/10 has only 4.3:1 (frontend/styl.md).
export function FrequencyBadge({ frequency }: FrequencyBadgeProps) {
  return (
    <span className="inline-block whitespace-nowrap rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-ink">
      {getFrequencyLabel(frequency)}
    </span>
  );
}
