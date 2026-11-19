"use client";

import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { Toast } from "@/components/ui/Toast";
import { ToastContext } from "@/lib/toast/toastContext";

type ToastProviderProps = {
  children: ReactNode;
};

type ActiveToast = {
  readonly id: number;
  readonly message: string;
};

export function ToastProvider({ children }: ToastProviderProps) {
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const lastId = useRef(0);

  const showToast = useCallback((message: string) => {
    lastId.current += 1;
    setToast({ id: lastId.current, message });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);
  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Always in the DOM, also when empty: text inserted into an existing region is announced reliably. */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {/* A new node for every toast: the same text twice in a row is announced again. */}
        {toast !== null && <span key={toast.id}>{toast.message}</span>}
      </div>
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:right-4 sm:justify-end">
        {toast !== null && (
          // The key restarts the timer and the pause state for every new toast.
          <Toast
            key={toast.id}
            message={toast.message}
            onDismiss={dismissToast}
          />
        )}
      </div>
    </ToastContext.Provider>
  );
}
