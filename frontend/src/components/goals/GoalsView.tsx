"use client";

import { GoalCard } from "@/components/goals/GoalCard";
import { GoalsSkeleton } from "@/components/goals/GoalsSkeleton";
import { TargetIcon } from "@/components/icons/TargetIcon";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  type SavingsGoalsState,
  useSavingsGoals,
} from "@/hooks/useSavingsGoals";
import { FOCUS_RING } from "@/lib/focusRing";

type ActiveState = Exclude<SavingsGoalsState, { readonly status: "idle" }>;

type GoalsErrorProps = {
  onRetry: () => void;
};

function GoalsError({ onRetry }: GoalsErrorProps) {
  return (
    <div className="flex max-w-md flex-col items-start gap-3">
      <Alert variant="error">Nie udało się wczytać celów.</Alert>
      <button
        type="button"
        onClick={onRetry}
        className={`min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium text-ink hover:bg-slate-100 ${FOCUS_RING}`}
      >
        Spróbuj ponownie
      </button>
    </div>
  );
}

type GoalsResultsProps = {
  state: ActiveState;
  onRetry: () => void;
};

function GoalsResults({ state, onRetry }: GoalsResultsProps) {
  if (state.status === "loading") {
    return <GoalsSkeleton />;
  }
  if (state.status === "error") {
    return <GoalsError onRetry={onRetry} />;
  }
  if (state.goals.length === 0) {
    return (
      <EmptyState
        icon={<TargetIcon />}
        title="Brak celów oszczędnościowych"
        description="Nie masz jeszcze żadnego celu oszczędnościowego."
      />
    );
  }
  // The order is the one from the API (nearest deadline first): the view does not sort.
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {state.goals.map((goal) => (
        <li key={goal.id} className="min-w-0">
          <GoalCard goal={goal} today={state.today} />
        </li>
      ))}
    </ul>
  );
}

export function GoalsView() {
  const { state, retry } = useSavingsGoals();

  if (state.status === "idle") {
    return null;
  }
  return <GoalsResults state={state} onRetry={retry} />;
}
