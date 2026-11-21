import { type RefObject, useCallback, useEffect, useRef } from "react";

// Any list state of the app: only the loading status matters here.
type ListState = {
  readonly status: "idle" | "loading" | "ready" | "error";
};

// After an edit the list reloads and its items are rebuilt, so the button that opened the dialog is gone.
// Once the list is back, the focus goes to the edit button of the same item (data-edit-for).
// When that item is not there anymore (a new date or the filters moved it) or the reload failed,
// it goes to the fallback element. The request is cleared on the first settled state, so a later reload
// never steals the focus.
export function useEditFocusRestore(
  state: ListState,
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
