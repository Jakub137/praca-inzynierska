import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PrimaryGoalCard } from "@/components/dashboard/PrimaryGoalCard";
import type { SavingsGoalsState } from "@/hooks/useSavingsGoals";
import {
  ACTIVE_GOAL,
  COMPLETED_GOAL,
  OVERDUE_GOAL,
  TEST_GOALS,
  TEST_TODAY,
} from "@/test-utils/goals";

const NBSP = "\u00a0";

function renderCard(state: SavingsGoalsState, onRetry = vi.fn()) {
  return render(<PrimaryGoalCard state={state} onRetry={onRetry} />);
}

describe("PrimaryGoalCard", () => {
  it("renders nothing while the user is not authenticated", () => {
    const { container } = renderCard({ status: "idle" });

    expect(container.innerHTML).toBe("");
  });

  it("shows a named skeleton while loading", () => {
    renderCard({ status: "loading" });

    expect(screen.getByRole("status").textContent).toBe(
      "Ładowanie: głównego celu",
    );
  });

  it("shows an error with a retry button that retries once", () => {
    const onRetry = vi.fn();
    renderCard({ status: "error" }, onRetry);

    expect(screen.getByRole("alert").textContent).toBe(
      "Nie udało się wczytać celów.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows an empty state with a link and no header link when there are no goals", () => {
    renderCard({ status: "ready", goals: [], today: TEST_TODAY });

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Brak celów oszczędnościowych",
      }),
    ).toBeDefined();
    const link = screen.getByRole("link", { name: "Przejdź do celów" });
    expect(link.getAttribute("href")).toBe("/goals");
    expect(screen.queryByRole("link", { name: /Wszystkie cele/ })).toBeNull();
  });

  it("shows the name, deadline, amounts, bar and hint of the first active goal", () => {
    renderCard({ status: "ready", goals: TEST_GOALS, today: TEST_TODAY });

    expect(
      screen.getByRole("heading", { level: 3, name: ACTIVE_GOAL.name }),
    ).toBeDefined();
    expect(
      screen.getByText("21 lipca 2027 · 8 miesięcy do terminu"),
    ).toBeDefined();
    // textContent keeps the non-breaking space that getByText collapses (as in DepositDialog.test).
    expect(
      screen.getByRole("region", { name: "Główny Cel Oszczędnościowy" })
        .textContent,
    ).toContain(`4${NBSP}500,00 zł z 6${NBSP}000,00 zł`);
    const bar = screen.getByRole("progressbar", {
      name: "Postęp celu: Wakacje we Włoszech",
    });
    expect(bar.getAttribute("aria-valuenow")).toBe("75");
    expect(
      screen.getByText("75% celu osiągnięte (odkładaj 187,50 zł/mies.)"),
    ).toBeDefined();
  });

  it("shows the first goal with a text mark when every goal is completed", () => {
    renderCard({ status: "ready", goals: [COMPLETED_GOAL], today: TEST_TODAY });

    expect(
      screen.getByRole("heading", { level: 3, name: COMPLETED_GOAL.name }),
    ).toBeDefined();
    expect(screen.getByText("Cel osiągnięty")).toBeDefined();
    expect(screen.getByText("108% celu osiągnięte")).toBeDefined();
  });

  it("keeps an active goal with a passed deadline when it comes first", () => {
    renderCard({
      status: "ready",
      goals: [OVERDUE_GOAL, ACTIVE_GOAL],
      today: TEST_TODAY,
    });

    expect(
      screen.getByRole("heading", { level: 3, name: OVERDUE_GOAL.name }),
    ).toBeDefined();
    expect(
      screen.getByText("1 października 2026 · Termin minął"),
    ).toBeDefined();
  });

  it("links to the goals page from the header", () => {
    renderCard({ status: "ready", goals: TEST_GOALS, today: TEST_TODAY });

    const link = screen.getByRole("link", { name: "Wszystkie cele →" });
    expect(link.getAttribute("href")).toBe("/goals");
    expect(
      screen.getByRole("region", { name: "Główny Cel Oszczędnościowy" }),
    ).toBeDefined();
  });
});
