import Link from "next/link";
import { SparkleIcon } from "@/components/icons/SparkleIcon";
import type { DashboardInsightState } from "@/hooks/useDashboardInsight";
import { buildBudgetsHref } from "@/lib/budgets/period";
import { FOCUS_RING } from "@/lib/focusRing";

const TITLE = "Sugestia (Moduł AI):";

type AiInsightBannerProps = {
  state: DashboardInsightState;
};

// A hint, not a widget: while loading, after an error and without an anomaly nothing is rendered,
// so there is no empty frame, no skeleton and no retry button.
export function AiInsightBanner({ state }: AiInsightBannerProps) {
  if (state.status !== "ready" || state.insight === null) {
    return null;
  }
  const { categoryId, categoryName, message } = state.insight;

  return (
    <section
      aria-label="Sugestia modułu AI"
      className="flex flex-col gap-3 rounded-lg border border-ai/30 bg-ai-surface p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-3">
        <SparkleIcon className="mt-0.5 size-5 shrink-0 text-ai" />
        <p className="min-w-0 text-sm text-ink">
          <span className="font-semibold text-ai">{TITLE}</span> {message}
        </p>
      </div>
      <Link
        href={buildBudgetsHref(null, categoryId)}
        aria-label={`Dostosuj limit: ${categoryName}`}
        className={`inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-ai hover:underline ${FOCUS_RING}`}
      >
        Dostosuj limit <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
