"use client";

import type { ReactNode } from "react";
import { Alert } from "@/components/ui/Alert";
import { useAuth } from "@/hooks/useAuth";
import { FOCUS_RING } from "@/lib/focusRing";

type SessionGateProps = {
  children: ReactNode;
};

// Never redirects: proxy.ts and the global 401 handler own redirects (T-028).
export function SessionGate({ children }: SessionGateProps) {
  const { status, retry } = useAuth();

  if (status === "authenticated") {
    return <>{children}</>;
  }
  if (status === "loading") {
    return (
      <p role="status" className="text-sm text-muted">
        Ładowanie…
      </p>
    );
  }
  if (status === "error") {
    return (
      <div className="flex max-w-md flex-col items-start gap-3">
        <Alert variant="error">Nie udało się połączyć z serwerem.</Alert>
        <button
          type="button"
          onClick={retry}
          className={`min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium text-ink hover:bg-slate-100 ${FOCUS_RING}`}
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }
  return null;
}
