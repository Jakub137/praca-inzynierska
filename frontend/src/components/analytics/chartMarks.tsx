import { useId } from "react";

export type MarkPattern = "solid" | "stripes" | "dots" | "grid";

// A series or a category on a chart: a theme colour, with a pattern for readers who do not
// tell the colours apart (WCAG 1.4.1).
export type ChartMark = {
  readonly color: string;
  readonly pattern: MarkPattern;
};

const PATTERN_INK = "var(--color-card)";

export function markFill(mark: ChartMark, patternId: string): string {
  return mark.pattern === "solid" ? mark.color : `url(#${patternId})`;
}

function PatternInk({ pattern }: { pattern: Exclude<MarkPattern, "solid"> }) {
  if (pattern === "stripes") {
    return <rect width="2" height="8" fill={PATTERN_INK} />;
  }
  if (pattern === "dots") {
    return <circle cx="4" cy="4" r="2" fill={PATTERN_INK} />;
  }
  return (
    <>
      <rect width="1.5" height="8" fill={PATTERN_INK} />
      <rect width="8" height="1.5" fill={PATTERN_INK} />
    </>
  );
}

// Goes into the <defs> of the SVG that uses markFill with the same id.
export function MarkPatternDef({ id, mark }: { id: string; mark: ChartMark }) {
  if (mark.pattern === "solid") {
    return null;
  }
  return (
    <pattern
      id={id}
      width="8"
      height="8"
      patternUnits="userSpaceOnUse"
      patternTransform="rotate(45)"
    >
      <rect width="8" height="8" fill={mark.color} />
      <PatternInk pattern={mark.pattern} />
    </pattern>
  );
}

// The legend marker: its own small SVG with its own pattern.
export function ChartSwatch({ mark }: { mark: ChartMark }) {
  const patternId = useId();

  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0">
      <defs>
        <MarkPatternDef id={patternId} mark={mark} />
      </defs>
      <rect width="16" height="16" rx="3" fill={markFill(mark, patternId)} />
    </svg>
  );
}
