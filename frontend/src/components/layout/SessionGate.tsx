"use client";

import type { ReactNode } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

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
        <Button variant="secondary" onClick={retry}>
          Spróbuj ponownie
        </Button>
      </div>
    );
  }
  return null;
}
