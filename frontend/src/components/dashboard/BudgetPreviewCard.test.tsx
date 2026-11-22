import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BudgetPreviewCard } from "@/components/dashboard/BudgetPreviewCard";
import type { BudgetUsageState } from "@/hooks/useBudgetUsage";
import { TEST_BUDGET_USAGE } from "@/test-utils/budgets";
import type { BudgetUsageResponse } from "@/types/api";

const LOW_USAGE: BudgetUsageResponse = {
  categoryId: 4,
  categoryName: "Zdrowie",
  limitAmount: 400,
  spentAmount: 40,
  percentage: 10,
  status: "NORMAL",
};

function renderCard(state: BudgetUsageState, onRetry = vi.fn()) {
  return render(<BudgetPreviewCard state={state} onRetry={onRetry} />);
}

const READY: BudgetUsageState = {
  status: "ready",
  usage: [LOW_USAGE, ...TEST_BUDGET_USAGE],
};

describe("BudgetPreviewCard", () => {
  it("renders nothing while the user is not authenticated", () => {
    const { container } = renderCard({ status: "idle" });

    expect(container.innerHTML).toBe("");
  });

  it("shows a named skeleton while loading", () => {
    renderCard({ status: "loading" });

    expect(screen.getByRole("status").textContent).toBe("Ładowanie: limitów");
  });

  it("shows an error with a retry button that retries once", () => {
    const onRetry = vi.fn();
    renderCard({ status: "error" }, onRetry);

    expect(screen.getByRole("alert").textContent).toBe(
      "Nie udało się wczytać limitów.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows an empty state with a link and no header link when there are no limits", () => {
    renderCard({ status: "ready", usage: [] });

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Brak limitów w tym miesiącu",
      }),
    ).toBeDefined();
    const link = screen.getByRole("link", { name: "Przejdź do limitów" });
    expect(link.getAttribute("href")).toBe("/budgets");
    expect(screen.queryByRole("link", { name: /Edytuj limity/ })).toBeNull();
  });

  it("shows only the three most used limits, highest percentage first", () => {
    renderCard(READY);

    const bars = screen.getAllByRole("progressbar");
    expect(bars.map((bar) => bar.getAttribute("aria-label"))).toEqual([
      "Wykorzystanie limitu: Paliwo",
      "Wykorzystanie limitu: Rozrywka",
      "Wykorzystanie limitu: Artykuły spożywcze",
    ]);
    expect(screen.queryByText("Zdrowie")).toBeNull();
  });

  it("shows the status as text and reads it in the progress bar", () => {
    renderCard(READY);

    expect(screen.getByText("184% · Przekroczono limit")).toBeDefined();
    expect(screen.getByText("99% · Zbliżasz się do limitu")).toBeDefined();
    expect(screen.getByText("76% · W normie")).toBeDefined();
    const exceeded = screen.getByRole("progressbar", {
      name: "Wykorzystanie limitu: Paliwo",
    });
    expect(exceeded.getAttribute("aria-valuetext")).toBe(
      "921,00 zł z 500,00 zł, 184%, limit przekroczony",
    );
  });

  it("links to the limits page from the header", () => {
    renderCard(READY);

    const link = screen.getByRole("link", { name: "Edytuj limity →" });
    expect(link.getAttribute("href")).toBe("/budgets");
    expect(
      screen.getByRole("region", { name: "Wykorzystanie Budżetu" }),
    ).toBeDefined();
  });
});
