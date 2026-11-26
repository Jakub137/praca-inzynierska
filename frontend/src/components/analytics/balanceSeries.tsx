import { useId } from "react";

export const INCOME_LABEL = "Przychody";
export const EXPENSE_LABEL = "Wydatki";

// Theme variables from globals.css: success is #047857, danger is #dc2626.
export const INCOME_FILL = "var(--color-success)";
const EXPENSE_COLOR = "var(--color-danger)";
const STRIPE_COLOR = "var(--color-card)";

export function patternFill(patternId: string): string {
  return `url(#${patternId})`;
}

// Green and red have almost the same lightness, so expenses also get diagonal stripes (WCAG 1.4.1).
export function ExpensePattern({ id }: { id: string }) {
  return (
    <pattern
      id={id}
      width="8"
      height="8"
      patternUnits="userSpaceOnUse"
      patternTransform="rotate(45)"
    >
      <rect width="8" height="8" fill={EXPENSE_COLOR} />
      <rect width="2" height="8" fill={STRIPE_COLOR} />
    </pattern>
  );
}

function Swatch({ fill }: { fill: string }) {
  return <rect width="16" height="16" rx="3" fill={fill} />;
}

const SWATCH_CLASS = "size-4 shrink-0";

export function BalanceLegend() {
  const patternId = useId();

  return (
    <ul
      aria-label="Legenda wykresu"
      className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-ink"
    >
      <li className="flex items-center gap-2">
        <svg aria-hidden="true" viewBox="0 0 16 16" className={SWATCH_CLASS}>
          <Swatch fill={INCOME_FILL} />
        </svg>
        {INCOME_LABEL}
      </li>
      <li className="flex items-center gap-2">
        <svg aria-hidden="true" viewBox="0 0 16 16" className={SWATCH_CLASS}>
          <defs>
            <ExpensePattern id={patternId} />
          </defs>
          <Swatch fill={patternFill(patternId)} />
        </svg>
        {EXPENSE_LABEL}
      </li>
    </ul>
  );
}
