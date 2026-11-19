"use client";

import { useId, useState } from "react";
import { CurrencyRatePanel } from "@/components/currency/CurrencyRatePanel";
import { StatusDot } from "@/components/currency/StatusDot";
import { ChevronDownIcon } from "@/components/icons/ChevronDownIcon";
import { usePopoverDisclosure } from "@/hooks/usePopoverDisclosure";
import { useRateTooltip } from "@/hooks/useRateTooltip";
import { FOCUS_RING } from "@/lib/focusRing";
import {
  PILL_FRACTION_DIGITS,
  formatRate,
  formatRatePublication,
} from "@/lib/format/currencyRate";
import type { CurrencyRateResponse } from "@/types/api";

const DEFAULT_CURRENCY: CurrencyRateResponse["currency"] = "EUR";
const LIVE_STATUS_TEXT = "dane NBP aktualne";
const FALLBACK_STATUS_TEXT = "kurs zastępczy";

type CurrencyRateMenuProps = {
  rates: readonly CurrencyRateResponse[];
};

export function CurrencyRateMenu({ rates }: CurrencyRateMenuProps) {
  const [selectedCurrency, setSelectedCurrency] = useState(DEFAULT_CURRENCY);
  const { isOpen, toggle, close, containerRef, triggerRef } =
    usePopoverDisclosure();
  const tooltip = useRateTooltip(isOpen);
  const panelId = useId();
  const tooltipId = useId();

  const selected =
    rates.find((rate) => rate.currency === selectedCurrency) ?? rates[0];
  if (selected === undefined) {
    return null;
  }
  const isFallback = selected.source === "FALLBACK";

  function handleSelect(currency: CurrencyRateResponse["currency"]) {
    setSelectedCurrency(currency);
    close();
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={tooltip.onMouseEnter}
      onMouseLeave={tooltip.onMouseLeave}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-describedby={tooltipId}
        onClick={toggle}
        onFocus={tooltip.onFocus}
        onBlur={tooltip.onBlur}
        className={`flex h-11 items-center gap-2 rounded-full border border-slate-300 bg-card px-3 text-sm font-medium text-ink hover:bg-slate-100 ${FOCUS_RING}`}
      >
        <StatusDot tone={isFallback ? "fallback" : "live"} />
        <span className="whitespace-nowrap">
          <span>NBP:</span>
          {` 1 ${selected.currency} ≈ ${formatRate(selected.rate, PILL_FRACTION_DIGITS)} PLN`}
        </span>
        <ChevronDownIcon
          className={`size-4 shrink-0 text-muted ${isOpen ? "rotate-180" : ""}`}
        />
        <span className="sr-only">
          {`, ${isFallback ? FALLBACK_STATUS_TEXT : LIVE_STATUS_TEXT}`}
        </span>
      </button>
      <div
        id={tooltipId}
        role="tooltip"
        hidden={!tooltip.isVisible}
        className="absolute right-0 top-full z-20 pt-2"
      >
        <p className="w-max max-w-64 rounded-lg bg-ink px-3 py-2 text-xs text-white">
          {formatRatePublication(selected)}
        </p>
      </div>
      <CurrencyRatePanel
        id={panelId}
        isOpen={isOpen}
        rates={rates}
        selected={selected}
        onSelect={handleSelect}
      />
    </div>
  );
}
