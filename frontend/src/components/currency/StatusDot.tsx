export type StatusDotTone = "live" | "fallback" | "unavailable";

const TONE_CLASSES: Record<StatusDotTone, string> = {
  live: "bg-success",
  fallback: "bg-warning",
  unavailable: "bg-muted",
};

type StatusDotProps = {
  tone: StatusDotTone;
};

// Decorative: the state is always also given as text (WCAG 1.4.1).
export function StatusDot({ tone }: StatusDotProps) {
  return (
    <span
      aria-hidden="true"
      className={`size-2 shrink-0 rounded-full ${TONE_CLASSES[tone]}`}
    />
  );
}
