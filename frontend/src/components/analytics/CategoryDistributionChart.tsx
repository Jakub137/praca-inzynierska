import { useId, useState } from "react";
import {
  Pie,
  PieChart,
  type PieSectorShapeProps,
  Sector,
  Tooltip,
} from "recharts";
import { MarkPatternDef, markFill } from "@/components/analytics/chartMarks";
import { DistributionLegend } from "@/components/analytics/DistributionLegend";
import { distributionMark } from "@/components/analytics/distributionMarks";
import { DistributionTable } from "@/components/analytics/DistributionTable";
import { DistributionTooltip } from "@/components/analytics/DistributionTooltip";
import { formatIsoDate } from "@/lib/format/date";
import { formatPln } from "@/lib/format/money";
import type {
  CategoryDistributionResponse,
  CategoryShareResponse,
} from "@/types/api";

// Clockwise from twelve o'clock, in the order of the legend.
const START_ANGLE = 90;
const END_ANGLE = START_ANGLE - 360;
const HIGHLIGHT_GROWTH = 6;
const DIMMED_OPACITY = 0.35;
// A white line between the segments: neighbours of similar lightness stay apart (WCAG 1.4.11).
const SEGMENT_GAP_WIDTH = 2;

// Recharts makes the SVG focusable; these classes draw the project's focus outline around it.
const PLOT_CLASS =
  "absolute inset-0 [&_.recharts-surface:focus-visible]:outline-2 [&_.recharts-surface:focus-visible]:outline-offset-2 [&_.recharts-surface:focus-visible]:outline-brand";

// The tooltip gets the data item without a type, so it is narrowed here.
function readCategoryId(item: unknown): unknown {
  return typeof item === "object" && item !== null && "categoryId" in item
    ? item.categoryId
    : undefined;
}

function findPointedCategory(
  item: unknown,
  categories: readonly CategoryShareResponse[],
): CategoryShareResponse | undefined {
  const categoryId = readCategoryId(item);
  return categories.find((category) => category.categoryId === categoryId);
}

type CategoryDistributionChartProps = {
  // At least one category.
  distribution: CategoryDistributionResponse;
};

export function CategoryDistributionChart({
  distribution,
}: CategoryDistributionChartProps) {
  const idPrefix = useId();
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [focusedRow, setFocusedRow] = useState<number | null>(null);
  const legendRow = hoveredRow ?? focusedRow;
  const { categories, dateFrom, dateTo, totalExpenses } = distribution;

  function patternId(index: number): string {
    return `${idPrefix}-${index}`;
  }

  function renderSegment(props: PieSectorShapeProps) {
    // A legend row wins over the pointer and the keyboard of the chart itself.
    const isHighlighted =
      legendRow === null ? props.isActive : props.index === legendRow;
    const isDimmed = legendRow !== null && !isHighlighted;
    return (
      <Sector
        {...props}
        fill={markFill(distributionMark(props.index), patternId(props.index))}
        fillOpacity={isDimmed ? DIMMED_OPACITY : 1}
        stroke="var(--color-card)"
        strokeWidth={SEGMENT_GAP_WIDTH}
        outerRadius={
          isHighlighted
            ? props.outerRadius + HIGHLIGHT_GROWTH
            : props.outerRadius
        }
      />
    );
  }

  return (
    <>
      {/* From "sm" the height is fixed, like the balance chart, and a long legend scrolls. */}
      <div className="flex flex-col gap-3 sm:h-84 sm:flex-row">
        <div className="relative h-64 text-xs sm:h-auto sm:min-w-0 sm:flex-1">
          {/* Before the chart in the DOM, so the tooltip is painted above this text. */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-sm text-muted">Razem</p>
            <p className="max-w-32 text-center text-base font-semibold wrap-break-word text-ink">
              {formatPln(totalExpenses)}
            </p>
          </div>
          <div className={PLOT_CLASS}>
            {/* "responsive" follows the size of the parent; accessibilityLayer stays on by default. */}
            <PieChart
              responsive
              style={{ width: "100%", height: "100%" }}
              aria-label={`Wykres pierścieniowy wydatków, okres: ${formatIsoDate(dateFrom)} – ${formatIsoDate(dateTo)}`}
            >
              <defs>
                {categories.map((category, index) => (
                  <MarkPatternDef
                    key={category.categoryId}
                    id={patternId(index)}
                    mark={distributionMark(index)}
                  />
                ))}
              </defs>
              {/* rootTabIndex -1: the whole chart stays one Tab stop. */}
              <Pie
                data={categories}
                dataKey="amount"
                nameKey="categoryName"
                innerRadius="64%"
                outerRadius="90%"
                startAngle={START_ANGLE}
                endAngle={END_ANGLE}
                rootTabIndex={-1}
                shape={renderSegment}
              />
              <Tooltip
                content={({ active, payload }) => (
                  <DistributionTooltip
                    active={active}
                    category={findPointedCategory(
                      payload?.[0]?.payload,
                      categories,
                    )}
                  />
                )}
              />
            </PieChart>
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-col sm:flex-1">
          <DistributionLegend
            categories={categories}
            onHover={setHoveredRow}
            onFocusChange={setFocusedRow}
          />
        </div>
      </div>
      <DistributionTable categories={categories} />
    </>
  );
}
