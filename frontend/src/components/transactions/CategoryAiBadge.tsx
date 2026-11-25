import { SparkleIcon } from "@/components/icons/SparkleIcon";

type CategoryAiBadgeProps = {
  id: string;
  // Percent, 0-100.
  confidence: number;
};

// Over the select before its arrow from `sm`. On narrow screens the category name would not fit next
// to it, so it sits below the select, right-aligned, and the fields below move down while it is shown.
const POSITION =
  "ml-auto mt-1 w-fit sm:absolute sm:right-9 sm:top-1/2 sm:mt-0 sm:-translate-y-1/2";

export function CategoryAiBadge({ id, confidence }: CategoryAiBadgeProps) {
  return (
    <span
      id={id}
      className={`pointer-events-none flex items-center gap-1 rounded-full border border-ai/30 bg-ai-surface px-2 py-0 text-xs font-medium text-ai sm:py-0.5 ${POSITION}`}
    >
      <SparkleIcon className="size-3.5" />
      {`Moduł AI: ${confidence}% trafności`}
    </span>
  );
}
