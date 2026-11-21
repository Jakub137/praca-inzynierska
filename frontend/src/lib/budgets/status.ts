import type { BudgetStatus } from "@/types/api";

export type BudgetStatusPresentation = {
  // Visible next to the bar: the status never relies on colour alone.
  readonly label: string;
  // Read after the amounts in the aria-valuetext of the progress bar.
  readonly spokenLabel: string;
  readonly barClass: string;
  readonly textClass: string;
};

export const BUDGET_STATUS_PRESENTATION: Record<
  BudgetStatus,
  BudgetStatusPresentation
> = {
  NORMAL: {
    label: "W normie",
    spokenLabel: "w normie",
    barClass: "bg-brand",
    textClass: "text-ink",
  },
  WARNING: {
    label: "Zbliżasz się do limitu",
    spokenLabel: "ostrzeżenie",
    barClass: "bg-warning",
    textClass: "text-warning",
  },
  EXCEEDED: {
    label: "Przekroczono limit",
    spokenLabel: "limit przekroczony",
    barClass: "bg-danger",
    textClass: "text-danger",
  },
};
