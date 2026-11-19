"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/icons/CheckIcon";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { FOCUS_RING } from "@/lib/focusRing";

export const TOAST_DURATION_MS = 5000;

type ToastProps = {
  message: string;
  onDismiss: () => void;
};

// The live region in ToastProvider announces the message; the card is not live, so it is not read twice.
// The timer stops while the pointer or the keyboard focus is on the card and restarts in full afterwards.
export function Toast({ message, onDismiss }: ToastProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isPaused = isHovered || isFocused;

  useEffect(() => {
    if (isPaused) {
      return;
    }
    const timer = window.setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [isPaused, onDismiss]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className="pointer-events-auto flex items-center gap-3 rounded-lg border border-success bg-card py-3 pr-2 pl-3 text-sm text-ink shadow-lg"
    >
      <CheckIcon className="size-4 shrink-0 text-success" />
      <p>{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Zamknij powiadomienie"
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-slate-100 hover:text-ink ${FOCUS_RING}`}
      >
        <CloseIcon className="size-5" />
      </button>
    </div>
  );
}
