import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SummaryMetricCards } from "@/components/dashboard/SummaryMetricCards";
import type { DashboardSummaryState } from "@/hooks/useDashboardSummary";
import {
  SUMMARY_WITHOUT_OPTIONALS,
  TEST_SUMMARY,
} from "@/test-utils/dashboard";

const NBSP = "\u00a0";

function renderCards(state: DashboardSummaryState, onRetry = vi.fn()) {
  return render(<SummaryMetricCards state={state} onRetry={onRetry} />);
}

function ready(
  summary: typeof TEST_SUMMARY = TEST_SUMMARY,
): DashboardSummaryState {
  return { status: "ready", summary };
}

describe("SummaryMetricCards", () => {
  it("renders nothing while the user is not authenticated", () => {
    const { container } = renderCards({ status: "idle" });

    expect(container.innerHTML).toBe("");
  });

  it("shows a skeleton for each of the three cards while loading", () => {
    renderCards({ status: "loading" });

    expect(screen.getAllByRole("status")).toHaveLength(3);
  });

  it("shows one error with a retry button that retries once", () => {
    const onRetry = vi.fn();
    renderCards({ status: "error" }, onRetry);

    expect(screen.getByRole("alert").textContent).toBe(
      "Nie udało się wczytać podsumowania.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows the three labels and amounts from the API", () => {
    renderCards(ready());

    // Amounts with a thousands separator are checked in textContent: getByText collapses the
    // non-breaking space in the page text, but not in the expected string (as in DepositDialog.test).
    for (const [name, amount] of [
      ["Dostępne środki", `14${NBSP}250,00 zł`],
      ["Wydatki w tym miesiącu", `3${NBSP}820,50 zł`],
      ["Przychody w tym miesiącu", `7${NBSP}500,00 zł`],
    ]) {
      const card = screen.getByRole("heading", { level: 2, name });
      expect(card.closest("article")?.textContent).toContain(amount);
    }
  });

  it("shows the change with a plus and the overall limit", () => {
    renderCards(ready());

    expect(screen.getByText("+12,5% vs poprz. mies.")).toBeDefined();
    const expenses = screen.getByRole("heading", {
      level: 2,
      name: "Wydatki w tym miesiącu",
    });
    expect(expenses.closest("article")?.textContent).toContain(
      `z 5${NBSP}000,00 zł limitu ogólnego`,
    );
  });

  it("leaves out the change and the limit when the API sends null", () => {
    renderCards(ready(SUMMARY_WITHOUT_OPTIONALS));

    expect(screen.queryByText(/vs poprz\. mies\./)).toBeNull();
    expect(screen.queryByText(/limitu ogólnego/)).toBeNull();
  });

  it("shows a decrease with a minus", () => {
    renderCards(ready({ ...TEST_SUMMARY, availableFundsChangePercent: -3.4 }));

    expect(screen.getByText("-3,4% vs poprz. mies.")).toBeDefined();
  });

  it("shows no change as zero without a sign", () => {
    renderCards(ready({ ...TEST_SUMMARY, availableFundsChangePercent: 0 }));

    expect(screen.getByText("0,0% vs poprz. mies.")).toBeDefined();
  });
});
