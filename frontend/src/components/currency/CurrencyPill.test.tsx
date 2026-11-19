import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CurrencyPill } from "@/components/currency/CurrencyPill";
import type { CurrencyRatesState } from "@/hooks/useCurrencyRates";
import { TEST_RATES } from "@/test-utils/currencyRates";
import type { CurrencyRateResponse } from "@/types/api";

const useCurrencyRatesMock = vi.hoisted(() =>
  vi.fn<() => CurrencyRatesState>(),
);

vi.mock("@/hooks/useCurrencyRates", () => ({
  useCurrencyRates: useCurrencyRatesMock,
}));

const PANEL_HEADING = "Bieżący kurs wymiany";
const ESCAPE = { key: "Escape" };

function renderReady(rates: readonly CurrencyRateResponse[] = TEST_RATES) {
  useCurrencyRatesMock.mockReturnValue({ status: "ready", rates });
  return render(<CurrencyPill />);
}

function withRate(
  currency: CurrencyRateResponse["currency"],
  patch: Partial<CurrencyRateResponse>,
) {
  return TEST_RATES.map((rate) =>
    rate.currency === currency ? { ...rate, ...patch } : rate,
  );
}

function getPill(currency = "EUR") {
  return screen.getByRole("button", {
    name: new RegExp(`^NBP: 1 ${currency} `),
  });
}

function getTooltip() {
  return screen.getByRole("tooltip", { hidden: true });
}

function openPanel() {
  fireEvent.click(getPill());
}

describe("CurrencyPill", () => {
  beforeEach(() => {
    useCurrencyRatesMock.mockReset();
  });

  it("shows the live EUR rate with a text status for screen readers", () => {
    renderReady();

    expect(getPill().textContent).toBe(
      "NBP: 1 EUR ≈ 4,31 PLN, dane NBP aktualne",
    );
  });

  it("marks a fallback rate with text in the pill and the tooltip", () => {
    renderReady(withRate("EUR", { source: "FALLBACK" }));

    expect(getPill().textContent).toBe("NBP: 1 EUR ≈ 4,31 PLN, kurs zastępczy");
    expect(getTooltip().textContent).toBe(
      "Kurs średni NBP z 17.11.2026 · kurs zastępczy",
    );
  });

  it("shows a plain unavailable pill without any button on error", () => {
    useCurrencyRatesMock.mockReturnValue({ status: "error" });

    render(<CurrencyPill />);

    expect(screen.getByText("Kurs niedostępny")).not.toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("announces loading without any button", () => {
    useCurrencyRatesMock.mockReturnValue({ status: "loading" });

    render(<CurrencyPill />);

    expect(screen.getByRole("status").textContent).toBe("Ładowanie kursów");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders nothing while idle", () => {
    useCurrencyRatesMock.mockReturnValue({ status: "idle" });

    const { container } = render(<CurrencyPill />);

    expect(container.firstChild).toBeNull();
  });

  it("starts with the panel closed", () => {
    renderReady();

    expect(getPill().getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("heading", { name: PANEL_HEADING })).toBeNull();
  });

  it("opens a panel with all four rates in API order, EUR selected", () => {
    renderReady();

    openPanel();

    expect(getPill().getAttribute("aria-expanded")).toBe("true");
    const items = screen.getAllByRole("button", { name: /≈ \d,\d{4} PLN$/ });
    expect(items.map((item) => item.textContent)).toEqual([
      "EUR ≈ 4,3100 PLN",
      "USD ≈ 4,0200 PLN",
      "GBP ≈ 5,1500 PLN",
      "CHF ≈ 4,6200 PLN",
    ]);
    expect(items.map((item) => item.getAttribute("aria-pressed"))).toEqual([
      "true",
      "false",
      "false",
      "false",
    ]);
  });

  it("shows the publication date in the panel header", () => {
    renderReady();

    openPanel();

    const heading = screen.getByRole("heading", { name: PANEL_HEADING });
    expect(heading.parentElement?.textContent).toContain(
      "Kurs średni NBP z 17.11.2026",
    );
  });

  it("selects USD, closes the panel and returns focus to the pill", () => {
    renderReady();
    openPanel();

    fireEvent.click(screen.getByRole("button", { name: "USD ≈ 4,0200 PLN" }));

    expect(getPill("USD").textContent).toBe(
      "NBP: 1 USD ≈ 4,02 PLN, dane NBP aktualne",
    );
    expect(getPill("USD").getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("heading", { name: PANEL_HEADING })).toBeNull();
    expect(document.activeElement).toBe(getPill("USD"));
  });

  it("closes the panel on Escape and returns focus to the pill", () => {
    renderReady();
    openPanel();

    fireEvent.keyDown(document, ESCAPE);

    expect(screen.queryByRole("heading", { name: PANEL_HEADING })).toBeNull();
    expect(document.activeElement).toBe(getPill());
  });

  it("closes the panel on a pointer press outside", () => {
    renderReady();
    openPanel();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole("heading", { name: PANEL_HEADING })).toBeNull();
    expect(document.activeElement).toBe(getPill());
  });

  it("links the tooltip to the pill and starts hidden", () => {
    renderReady();
    const tooltip = getTooltip();

    expect(getPill().getAttribute("aria-describedby")).toBe(tooltip.id);
    expect(tooltip.textContent).toBe("Kurs średni NBP z 17.11.2026");
    expect(tooltip.hidden).toBe(true);
  });

  it("shows the tooltip on keyboard focus and hides it on Escape", () => {
    renderReady();
    const tooltip = getTooltip();

    fireEvent.focus(getPill());
    expect(tooltip.hidden).toBe(false);

    fireEvent.keyDown(document, ESCAPE);
    expect(tooltip.hidden).toBe(true);

    fireEvent.blur(getPill());
    fireEvent.focus(getPill());
    expect(tooltip.hidden).toBe(false);
  });

  it("shows the tooltip on hover and keeps it while the pointer is on it", () => {
    renderReady();
    const tooltip = getTooltip();

    fireEvent.mouseEnter(getPill());
    expect(tooltip.hidden).toBe(false);

    fireEvent.mouseOut(getPill(), { relatedTarget: tooltip });
    fireEvent.mouseOver(tooltip, { relatedTarget: getPill() });
    expect(tooltip.hidden).toBe(false);

    fireEvent.mouseLeave(getPill());
    expect(tooltip.hidden).toBe(true);
  });

  it("hides the tooltip while the panel is open", () => {
    renderReady();
    const tooltip = getTooltip();
    fireEvent.focus(getPill());

    openPanel();

    expect(tooltip.hidden).toBe(true);
  });

  it("makes the pill, tooltip and status follow the selected currency", () => {
    renderReady(
      withRate("USD", { effectiveDate: "2026-11-14", source: "FALLBACK" }),
    );
    openPanel();

    fireEvent.click(
      screen.getByRole("button", {
        name: "USD ≈ 4,0200 PLN (kurs zastępczy)",
      }),
    );

    expect(getPill("USD").textContent).toBe(
      "NBP: 1 USD ≈ 4,02 PLN, kurs zastępczy",
    );
    expect(getTooltip().textContent).toBe(
      "Kurs średni NBP z 14.11.2026 · kurs zastępczy",
    );
  });
});
