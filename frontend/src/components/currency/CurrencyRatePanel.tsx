import { CheckIcon } from "@/components/icons/CheckIcon";
import { FOCUS_RING } from "@/lib/focusRing";
import {
  PANEL_FRACTION_DIGITS,
  formatRate,
  formatRatePublication,
} from "@/lib/format/currencyRate";
import type { CurrencyRateResponse } from "@/types/api";

const FALLBACK_LABEL = "(kurs zastępczy)";

type CurrencyRatePanelProps = {
  id: string;
  isOpen: boolean;
  rates: readonly CurrencyRateResponse[];
  selected: CurrencyRateResponse;
  onSelect: (currency: CurrencyRateResponse["currency"]) => void;
};

export function CurrencyRatePanel({
  id,
  isOpen,
  rates,
  selected,
  onSelect,
}: CurrencyRatePanelProps) {
  return (
    <div
      id={id}
      hidden={!isOpen}
      className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-line bg-card p-2 shadow-lg"
    >
      <div className="px-3 py-2">
        <h2 className="text-sm font-semibold text-ink">Bieżący kurs wymiany</h2>
        <p className="text-xs text-muted">{formatRatePublication(selected)}</p>
      </div>
      <ul>
        {rates.map((rate) => {
          const isSelected = rate.currency === selected.currency;
          const label = `${rate.currency} ≈ ${formatRate(rate.rate, PANEL_FRACTION_DIGITS)} PLN`;
          return (
            <li key={rate.currency}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelect(rate.currency)}
                className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-ink hover:bg-slate-100 ${isSelected ? "font-semibold" : ""} ${FOCUS_RING}`}
              >
                <span className="flex-1">
                  {label}
                  {rate.source === "FALLBACK" && (
                    <>
                      {" "}
                      <span className="text-xs text-warning">
                        {FALLBACK_LABEL}
                      </span>
                    </>
                  )}
                </span>
                <span className="size-4 shrink-0">
                  {isSelected && <CheckIcon className="size-4 text-brand" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
