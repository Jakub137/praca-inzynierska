"use client";

import { type Ref, useRef, useState } from "react";
import { DepositDialog } from "@/components/goals/DepositDialog";
import { GoalCard, type GoalDepositHandler } from "@/components/goals/GoalCard";
import { GoalsSkeleton } from "@/components/goals/GoalsSkeleton";
import { NewGoalDialog } from "@/components/goals/NewGoalDialog";
import { TargetIcon } from "@/components/icons/TargetIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { RetryError } from "@/components/ui/RetryError";
import { useCreateSavingsGoal } from "@/hooks/useCreateSavingsGoal";
import { useDepositToGoal } from "@/hooks/useDepositToGoal";
import { useEditFocusRestore } from "@/hooks/useEditFocusRestore";
import {
  type SavingsGoalsState,
  useSavingsGoals,
} from "@/hooks/useSavingsGoals";
import { PRIMARY_ACTION } from "@/lib/buttonStyles";
import { getTodayIso } from "@/lib/goals/deadline";
import type { SavingsGoalResponse } from "@/types/api";

const NEW_GOAL_LABEL = "+ Nowy cel";

// No card has this id, so after a new goal the focus goes to the fallback of useEditFocusRestore:
// the add button in the header (the button that opened the dialog may be the one of the empty state,
// which is gone after the reload).
const NEW_GOAL_FOCUS_ID = "new-goal";

type ActiveState = Exclude<SavingsGoalsState, { readonly status: "idle" }>;

type GoalDialogState =
  // "today" is read when the dialog opens, so that rendering stays pure.
  | { readonly mode: "create"; readonly today: string }
  | { readonly mode: "deposit"; readonly goal: SavingsGoalResponse };

type AddGoalHandler = (opener: HTMLElement) => void;

type NewGoalButtonProps = {
  onAdd: AddGoalHandler;
  ref?: Ref<HTMLButtonElement>;
};

function NewGoalButton({ onAdd, ref }: NewGoalButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={(event) => onAdd(event.currentTarget)}
      className={PRIMARY_ACTION}
    >
      {NEW_GOAL_LABEL}
    </button>
  );
}

type GoalsResultsProps = {
  state: ActiveState;
  onRetry: () => void;
  onAdd: AddGoalHandler;
  onDeposit: GoalDepositHandler;
};

function GoalsResults({ state, onRetry, onAdd, onDeposit }: GoalsResultsProps) {
  if (state.status === "loading") {
    return <GoalsSkeleton />;
  }
  if (state.status === "error") {
    return (
      <RetryError message="Nie udało się wczytać celów." onRetry={onRetry} />
    );
  }
  if (state.goals.length === 0) {
    return (
      <EmptyState
        icon={<TargetIcon />}
        title="Brak celów oszczędnościowych"
        description="Nie masz jeszcze żadnego celu oszczędnościowego."
        actionButton={<NewGoalButton onAdd={onAdd} />}
      />
    );
  }
  // The order is the one from the API (nearest deadline first): the view does not sort.
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {state.goals.map((goal) => (
        <li key={goal.id} className="min-w-0">
          <GoalCard goal={goal} today={state.today} onDeposit={onDeposit} />
        </li>
      ))}
    </ul>
  );
}

export function GoalsView() {
  const { state, retry } = useSavingsGoals();
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [dialog, setDialog] = useState<GoalDialogState | null>(null);
  // After a saved deposit the goals reload and the cards are rebuilt: the focus goes back to the same card.
  const requestFocus = useEditFocusRestore(state, addButtonRef);

  // Order matters: remember where the focus goes, close the dialog, reload the goals, then the hook
  // shows the toast. The progress bar and the monthly contribution come from the reloaded list (the
  // backend computes them), never from local arithmetic.
  const createGoal = useCreateSavingsGoal({
    onSaved: () => {
      requestFocus(NEW_GOAL_FOCUS_ID);
      setDialog(null);
      retry();
    },
  });
  const deposit = useDepositToGoal({
    onSaved: (goalId) => {
      requestFocus(String(goalId));
      setDialog(null);
      retry();
    },
  });

  const openCreateDialog: AddGoalHandler = (opener) => {
    openerRef.current = opener;
    // The clock is read in the event handler, not during rendering.
    setDialog({ mode: "create", today: getTodayIso(new Date()) });
  };

  const openDepositDialog: GoalDepositHandler = (goal, opener) => {
    openerRef.current = opener;
    setDialog({ mode: "deposit", goal });
  };

  const closeDialog = () => setDialog(null);

  if (state.status === "idle") {
    return null;
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <NewGoalButton ref={addButtonRef} onAdd={openCreateDialog} />
      </div>
      <GoalsResults
        state={state}
        onRetry={retry}
        onAdd={openCreateDialog}
        onDeposit={openDepositDialog}
      />
      {dialog?.mode === "create" && (
        <NewGoalDialog
          today={dialog.today}
          returnFocusRef={openerRef}
          onClose={closeDialog}
          onSubmit={createGoal}
        />
      )}
      {dialog?.mode === "deposit" && (
        <DepositDialog
          key={dialog.goal.id}
          goal={dialog.goal}
          returnFocusRef={openerRef}
          onClose={closeDialog}
          onSubmit={(request) => deposit(dialog.goal.id, request)}
        />
      )}
    </div>
  );
}
