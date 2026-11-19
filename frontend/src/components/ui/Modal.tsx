"use client";

import {
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
} from "react";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { FOCUS_RING } from "@/lib/focusRing";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  // Focused right after opening; without it the browser picks the first focusable element.
  initialFocusRef?: RefObject<HTMLElement | null>;
  // Gets the focus back on close; without it the element focused at opening does.
  returnFocusRef?: RefObject<HTMLElement | null>;
  footer: ReactNode;
  children: ReactNode;
};

function findOpener(
  returnFocusRef: RefObject<HTMLElement | null> | undefined,
): HTMLElement | null {
  const explicit = returnFocusRef?.current ?? null;
  if (explicit !== null) {
    return explicit;
  }
  const active = document.activeElement;
  return active instanceof HTMLElement ? active : null;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  initialFocusRef,
  returnFocusRef,
  footer,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null || !open) {
      return;
    }
    // Read before showModal(): afterwards the focus is already inside the dialog.
    const opener = findOpener(returnFocusRef);
    dialog.showModal();
    initialFocusRef?.current?.focus();
    return () => {
      dialog.close();
      opener?.focus();
    };
  }, [open, initialFocusRef, returnFocusRef]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        // Esc: the parent owns the state, so the browser must not close the dialog itself.
        event.preventDefault();
        onClose();
      }}
      onClose={(event) => {
        // A close the parent did not ask for (Chrome closes without "cancel" on a second Esc).
        if (open && !event.currentTarget.open) {
          onClose();
        }
      }}
      className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-lg flex-col rounded-xl border border-line bg-card p-0 text-ink shadow-xl backdrop:bg-ink/50 open:flex"
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <div>
          <h2 id={titleId} className="text-xl font-semibold text-ink">
            {title}
          </h2>
          <p id={descriptionId} className="mt-1 text-sm text-muted">
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Zamknij"
          className={`flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-slate-100 hover:text-ink ${FOCUS_RING}`}
        >
          <CloseIcon className="size-6" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>
      <div className="border-t border-line px-6 py-4">{footer}</div>
    </dialog>
  );
}
