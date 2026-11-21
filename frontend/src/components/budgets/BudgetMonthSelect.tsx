"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SelectField } from "@/components/ui/SelectField";
import { buildBudgetsHref } from "@/lib/budgets/period";
import type { MonthOption } from "@/lib/transactions/months";

type BudgetMonthSelectProps = {
  // "RRRR-MM" from the address, or null for the current month.
  month: string | null;
  monthOptions: readonly MonthOption[];
};

// The address (and so the "month" prop) changes only after the server render.
// Until then the select shows the chosen value; a new "month" ends the pending state.
type PendingMonth = {
  readonly base: string | null;
  readonly next: string | null;
};

export function BudgetMonthSelect({
  month,
  monthOptions,
}: BudgetMonthSelectProps) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingMonth | null>(null);
  // The first option is the current month: choosing it clears the address.
  const defaultMonth = monthOptions[0].value;
  const shown =
    pending !== null && pending.base === month ? pending.next : month;

  function selectMonth(value: string) {
    const next = value === defaultMonth ? null : value;
    setPending({ base: month, next });
    router.push(buildBudgetsHref(next), { scroll: false });
  }

  return (
    <SelectField
      id="budgets-month"
      label="Miesiąc"
      value={shown ?? defaultMonth}
      onChange={selectMonth}
    >
      {monthOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </SelectField>
  );
}
