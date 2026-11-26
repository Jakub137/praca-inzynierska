import { ChartSwatch } from "@/components/analytics/chartMarks";
import { distributionMark } from "@/components/analytics/distributionMarks";
import { FOCUS_RING } from "@/lib/focusRing";
import { formatPln, formatShare } from "@/lib/format/money";
import type { CategoryShareResponse } from "@/types/api";

const ITEM_CLASS = `flex min-h-11 w-full cursor-default items-center gap-2 rounded-lg px-2 py-1 text-left text-sm text-ink hover:bg-slate-100 ${FOCUS_RING}`;

type DistributionLegendProps = {
  categories: readonly CategoryShareResponse[];
  // The position of the pointed or focused row; null when the pointer or the focus leaves it.
  onHover: (index: number | null) => void;
  onFocusChange: (index: number | null) => void;
};

export function DistributionLegend({
  categories,
  onHover,
  onFocusChange,
}: DistributionLegendProps) {
  return (
    // The padding leaves room for the focus ring inside the scrolled list.
    <ul
      aria-label="Legenda wykresu kategorii"
      className="flex min-w-0 flex-col gap-1 p-1 sm:flex-1 sm:overflow-y-auto"
    >
      {categories.map((category, index) => (
        <li key={category.categoryId}>
          {/* A button, so the highlight also works from the keyboard and by touch. */}
          <button
            type="button"
            className={ITEM_CLASS}
            onMouseEnter={() => onHover(index)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onFocusChange(index)}
            onBlur={() => onFocusChange(null)}
            // Some touch browsers do not focus a tapped button by themselves.
            onClick={(event) => event.currentTarget.focus()}
          >
            <ChartSwatch mark={distributionMark(index)} />
            <span className="flex min-w-0 flex-col">
              <span className="wrap-break-word">{category.categoryName}</span>
              <span className="text-muted">
                {`${formatPln(category.amount)} · ${formatShare(category.percentage)}`}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
