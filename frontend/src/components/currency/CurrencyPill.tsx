"use client";

import { CurrencyRateMenu } from "@/components/currency/CurrencyRateMenu";
import { StatusDot } from "@/components/currency/StatusDot";
import { useCurrencyRates } from "@/hooks/useCurrencyRates";

// Fixed size, so the header does not jump when the rates arrive.
function PillSkeleton() {
  return (
    <>
      <div
        aria-hidden="true"
        className="h-11 w-48 animate-pulse rounded-full bg-line motion-reduce:animate-none"
      />
      <span role="status" className="sr-only">
        Ładowanie kursów
      </span>
    </>
  );
}

// A plain element, not a button: there is no panel to open.
function PillUnavailable() {
  return (
    <div className="flex h-11 items-center gap-2 rounded-full border border-line px-3 text-sm text-muted">
      <StatusDot tone="unavailable" />
      <span>Kurs niedostępny</span>
    </div>
  );
}

export function CurrencyPill() {
  const state = useCurrencyRates();

  switch (state.status) {
    case "idle":
      return null;
    case "loading":
      return <PillSkeleton />;
    case "error":
      return <PillUnavailable />;
    case "ready":
      return <CurrencyRateMenu rates={state.rates} />;
  }
}
