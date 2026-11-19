import { type RefObject, useCallback, useEffect, useRef } from "react";
import type { TransactionsState } from "@/hooks/useTransactions";

// After an edit the list reloads and its rows are rebuilt, so the pencil that opened the dialog is gone.
// Once the list is back, the focus goes to the pencil of the same transaction (data-edit-for).
// When that row is not on the page anymore (a new date or the filters moved it) or the reload failed,
// it goes to the fallback element. The request is cleared on the first settled state, so a later reload
// never steals the focus.
export function useEditFocusRestore(
  state: TransactionsState,
  fallbackRef: RefObject<HTMLElement | null>,
): (id: string) => void {
  const pendingIdRef = useRef<string | null>(null);

  useEffect(() => {
    const id = pendingIdRef.current;
    if (id === null) {
      return;
    }
    if (state.status !== "ready" && state.status !== "error") {
      return;
    }
    pendingIdRef.current = null;
    const editButton =
      state.status === "ready"
        ? document.querySelector<HTMLElement>(`[data-edit-for="${id}"]`)
        : null;
    (editButton ?? fallbackRef.current)?.focus();
  }, [state, fallbackRef]);

  return useCallback((id: string) => {
    pendingIdRef.current = id;
  }, []);
}
