import { type ChartMark, ChartSwatch } from "@/components/analytics/chartMarks";

export const INCOME_LABEL = "Przychody";
export const EXPENSE_LABEL = "Wydatki";

// Theme variables from globals.css: success is #047857, danger is #dc2626.
export const INCOME_MARK: ChartMark = {
  color: "var(--color-success)",
  pattern: "solid",
};
// Green and red have almost the same lightness, so expenses also get diagonal stripes (WCAG 1.4.1).
export const EXPENSE_MARK: ChartMark = {
  color: "var(--color-danger)",
  pattern: "stripes",
};

export function BalanceLegend() {
  return (
    <ul
      aria-label="Legenda wykresu"
      className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-ink"
    >
      <li className="flex items-center gap-2">
        <ChartSwatch mark={INCOME_MARK} />
        {INCOME_LABEL}
      </li>
      <li className="flex items-center gap-2">
        <ChartSwatch mark={EXPENSE_MARK} />
        {EXPENSE_LABEL}
      </li>
    </ul>
  );
}
