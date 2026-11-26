import type { ChartMark, MarkPattern } from "@/components/analytics/chartMarks";

// Theme variables from globals.css. No green: on the balance chart green means income.
const MARK_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
  "var(--color-chart-7)",
  "var(--color-chart-8)",
] as const;

const MARK_PATTERNS: readonly MarkPattern[] = [
  "solid",
  "stripes",
  "dots",
  "grid",
];

// The index is the position in the API answer (from the biggest amount). The pattern moves by one
// after each round of colours, so the first 32 pairs differ; from the 33rd category they repeat.
export function distributionMark(index: number): ChartMark {
  const round = Math.floor(index / MARK_COLORS.length);
  return {
    color: MARK_COLORS[index % MARK_COLORS.length],
    pattern: MARK_PATTERNS[(index + round) % MARK_PATTERNS.length],
  };
}
