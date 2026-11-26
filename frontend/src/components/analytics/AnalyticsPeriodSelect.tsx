"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SelectField } from "@/components/ui/SelectField";
import {
  ANALYTICS_PERIODS,
  type AnalyticsMonths,
  buildAnalyticsHref,
  parseAnalyticsMonths,
} from "@/lib/analytics/period";

type AnalyticsPeriodSelectProps = {
  // The period already read from the address.
  months: AnalyticsMonths;
};

// The address (and so the "months" prop) changes only after the server render.
// Until then the select shows the chosen value.
type PendingPeriod = {
  readonly base: AnalyticsMonths;
  readonly next: AnalyticsMonths;
};

export function AnalyticsPeriodSelect({ months }: AnalyticsPeriodSelectProps) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingPeriod | null>(null);
  // Once the address has moved on, the pending choice is dropped:
  // otherwise "Back" to the previous address would show the chosen value again.
  if (pending !== null && pending.base !== months) {
    setPending(null);
  }
  const shown =
    pending !== null && pending.base === months ? pending.next : months;

  function selectPeriod(value: string) {
    const next = parseAnalyticsMonths(value);
    setPending({ base: months, next });
    router.push(buildAnalyticsHref(next), { scroll: false });
  }

  return (
    <SelectField
      id="analytics-period"
      label="Okres"
      value={String(shown)}
      onChange={selectPeriod}
    >
      {ANALYTICS_PERIODS.map((period) => (
        <option key={period.months} value={period.months}>
          {period.label}
        </option>
      ))}
    </SelectField>
  );
}
