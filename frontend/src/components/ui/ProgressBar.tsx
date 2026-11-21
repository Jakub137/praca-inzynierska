export type ProgressBarTone = "brand" | "warning" | "danger";

const MIN_VALUE = 0;
const FULL_WIDTH_PERCENT = 100;

const TONE_CLASS: Record<ProgressBarTone, string> = {
  brand: "bg-brand",
  warning: "bg-warning",
  danger: "bg-danger",
};

type ProgressBarProps = {
  value: number;
  max: number;
  tone?: ProgressBarTone;
  // Accessible name (aria-label): a bar without a name fails WCAG 4.1.2.
  // Visible texts (amounts, status) belong to the parent component.
  label: string;
  // Full text read by screen readers instead of the bare number.
  valueText?: string;
};

// Keeps the fill and aria-valuenow within 0..max; a non-positive max gives an empty bar.
function clampValue(value: number, max: number): number {
  if (max <= MIN_VALUE) {
    return MIN_VALUE;
  }
  return Math.min(max, Math.max(MIN_VALUE, value));
}

function toWidthPercent(clamped: number, max: number): number {
  if (max <= MIN_VALUE) {
    return MIN_VALUE;
  }
  return (clamped * FULL_WIDTH_PERCENT) / max;
}

export function ProgressBar({
  value,
  max,
  tone = "brand",
  label,
  valueText,
}: ProgressBarProps) {
  const clamped = clampValue(value, max);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={MIN_VALUE}
      aria-valuemax={max}
      aria-valuetext={valueText}
      className="h-2 w-full overflow-hidden rounded-full bg-line"
    >
      <div
        className={`h-full rounded-full ${TONE_CLASS[tone]}`}
        style={{ width: `${toWidthPercent(clamped, max)}%` }}
      />
    </div>
  );
}
