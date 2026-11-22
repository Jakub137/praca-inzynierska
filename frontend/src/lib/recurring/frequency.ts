import type { PaymentFrequency } from "@/types/api";

// Same default as the select of the dialog: most subscriptions and bills are monthly.
export const DEFAULT_FREQUENCY: PaymentFrequency = "MONTHLY";

const FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  WEEKLY: "Co tydzień",
  MONTHLY: "Co miesiąc",
  YEARLY: "Co rok",
};

// Order of the select: from the shortest period to the longest.
const FREQUENCIES: readonly PaymentFrequency[] = [
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
];

type FrequencyOption = {
  readonly value: PaymentFrequency;
  readonly label: string;
};

export const FREQUENCY_OPTIONS: readonly FrequencyOption[] = FREQUENCIES.map(
  (value) => ({ value, label: FREQUENCY_LABELS[value] }),
);

export function getFrequencyLabel(frequency: PaymentFrequency): string {
  return FREQUENCY_LABELS[frequency];
}

export function parseFrequency(value: string): PaymentFrequency | null {
  return FREQUENCIES.find((frequency) => frequency === value) ?? null;
}
