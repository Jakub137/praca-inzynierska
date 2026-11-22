import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SavingsMetricCard } from "@/components/dashboard/SavingsMetricCard";
import type { SavingsGoalsState } from "@/hooks/useSavingsGoals";
import { COMPLETED_GOAL, TEST_GOALS, TEST_TODAY } from "@/test-utils/goals";

const NBSP = "\u00a0";

function renderCard(state: SavingsGoalsState, onRetry = vi.fn()) {
  return render(<SavingsMetricCard state={state} onRetry={onRetry} />);
}

describe("SavingsMetricCard", () => {
  it("renders nothing while the user is not authenticated", () => {
    const { container } = renderCard({ status: "idle" });

    expect(container.innerHTML).toBe("");
  });

  it("shows a named skeleton while loading", () => {
    renderCard({ status: "loading" });

    expect(screen.getByRole("status").textContent).toBe(
      "Ładowanie: Odłożone na cele",
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

  it("shows the saved amount and the percentage of the primary goal", () => {
    renderCard({ status: "ready", goals: TEST_GOALS, today: TEST_TODAY });

    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Odłożone na cele",
    });
    // textContent keeps the non-breaking space that getByText collapses (as in DepositDialog.test).
    expect(heading.closest("article")?.textContent).toContain(
      `4${NBSP}500,00 zł`,
    );
    expect(screen.getByText("75% celu: Wakacje we Włoszech")).toBeDefined();
  });

  it("shows the first goal when every goal is completed", () => {
    renderCard({ status: "ready", goals: [COMPLETED_GOAL], today: TEST_TODAY });

    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Odłożone na cele",
    });
    expect(heading.closest("article")?.textContent).toContain(
      `6${NBSP}500,00 zł`,
    );
    expect(screen.getByText("108% celu: Poduszka finansowa")).toBeDefined();
  });

  it("shows no goal and a link to the goals page when there are none", () => {
    renderCard({ status: "ready", goals: [], today: TEST_TODAY });

    expect(screen.getByText("Brak celu")).toBeDefined();
    const link = screen.getByRole("link", { name: "Przejdź do celów" });
    expect(link.getAttribute("href")).toBe("/goals");
  });
});
