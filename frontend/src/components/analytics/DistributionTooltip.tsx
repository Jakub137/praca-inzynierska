import { formatPln, formatShare } from "@/lib/format/money";
import type { CategoryShareResponse } from "@/types/api";

type DistributionTooltipProps = {
  active: boolean;
  category: CategoryShareResponse | undefined;
};

export function DistributionTooltip({
  active,
  category,
}: DistributionTooltipProps) {
  // The live region stays in the DOM: a region inserted together with its text may not be announced.
  return (
    <div role="status" aria-live="assertive">
      {active && category !== undefined && (
        <div className="w-48 rounded-lg border border-line bg-card p-3 text-sm wrap-break-word whitespace-normal text-ink shadow-md">
          <p className="font-semibold">{category.categoryName}</p>
          <p>{`Kwota: ${formatPln(category.amount)}`}</p>
          <p>{`Udział: ${formatShare(category.percentage)}`}</p>
        </div>
      )}
    </div>
  );
}
