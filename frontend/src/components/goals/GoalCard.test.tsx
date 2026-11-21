import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GoalCard, type GoalDepositHandler } from "@/components/goals/GoalCard";
import {
  ACTIVE_GOAL,
  COMPLETED_GOAL,
  DUE_SOON_GOAL,
  OVERDUE_GOAL,
  TEST_TODAY,
} from "@/test-utils/goals";

// formatPln groups thousands with a non-breaking space; an escape survives copying the plan.
const NBSP = " ";

function renderCard(
  goal: Parameters<typeof GoalCard>[0]["goal"],
  onDeposit?: GoalDepositHandler,
) {
  return render(
    <GoalCard goal={goal} today={TEST_TODAY} onDeposit={onDeposit} />,
  );
}

describe("GoalCard", () => {
  it("shows the goal name as a heading with the full name in the title", () => {
    renderCard(ACTIVE_GOAL);

    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Wakacje we Włoszech",
    });
    expect(heading.getAttribute("title")).toBe("Wakacje we Włoszech");
  });

  it("shows the deadline, the amounts and the subtext of an active goal", () => {
    renderCard(ACTIVE_GOAL);

    const text = screen.getByRole("article").textContent;
    expect(text).toContain("21 lipca 2027 · 8 miesięcy do terminu");
    expect(text).toContain(`4${NBSP}500,00 zł / 6${NBSP}000,00 zł`);
    expect(text).toContain("75% celu osiągnięte (odkładaj 187,50 zł/mies.)");
  });

  it("describes the progress bar with the amounts and the percentage", () => {
    renderCard(ACTIVE_GOAL);

    const bar = screen.getByRole("progressbar", {
      name: "Postęp celu: Wakacje we Włoszech",
    });
    expect(bar.getAttribute("aria-valuenow")).toBe("75");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
    expect(bar.getAttribute("aria-valuetext")).toBe(
      `4${NBSP}500,00 zł z 6${NBSP}000,00 zł, 75%`,
    );
    expect(bar.firstElementChild?.className).toContain("bg-brand");
  });

  it("shows no completed marker for an active goal", () => {
    renderCard(ACTIVE_GOAL);

    expect(screen.queryByText("Cel osiągnięty")).toBeNull();
  });

  it("marks a completed goal with text, not only a colour, and gives no advice", () => {
    renderCard(COMPLETED_GOAL);

    expect(screen.getByText("Cel osiągnięty")).toBeTruthy();
    const text = screen.getByRole("article").textContent;
    expect(text).toContain("31 grudnia 2027");
    expect(text).not.toContain("odkładaj");
    expect(text).not.toContain("odłóż");
    expect(text).toContain("108% celu osiągnięte");
  });

  it("clamps the bar of an overpaid goal and says it is completed", () => {
    renderCard(COMPLETED_GOAL);

    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("100");
    expect(bar.getAttribute("aria-valuetext")).toBe(
      `6${NBSP}500,00 zł z 6${NBSP}000,00 zł, 108%, cel osiągnięty`,
    );
  });

  it("says the deadline passed and asks for the whole remaining amount", () => {
    renderCard(OVERDUE_GOAL);

    const text = screen.getByRole("article").textContent;
    expect(text).toContain("1 października 2026 · Termin minął");
    expect(text).toContain(
      `15% celu osiągnięte (odłóż 6${NBSP}800,00 zł, aby osiągnąć cel)`,
    );
  });

  it("says the deadline is within a month and asks for the whole remaining amount", () => {
    renderCard(DUE_SOON_GOAL);

    const text = screen.getByRole("article").textContent;
    expect(text).toContain("10 grudnia 2026 · Termin w ciągu miesiąca");
    expect(text).toContain(
      "20% celu osiągnięte (odłóż 400,00 zł, aby osiągnąć cel)",
    );
  });

  it("has no deposit button without a handler", () => {
    renderCard(ACTIVE_GOAL);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("names the deposit button after the goal and marks it for the focus restore", () => {
    renderCard(ACTIVE_GOAL, vi.fn());

    const button = screen.getByRole("button", {
      name: "Wpłać kwotę: Wakacje we Włoszech",
    });
    expect(button.textContent).toBe("+ Wpłać kwotę");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("data-edit-for")).toBe("1");
  });

  it("keeps the deposit button on a completed goal: an overpayment is allowed", () => {
    renderCard(COMPLETED_GOAL, vi.fn());

    expect(
      screen.getByRole("button", { name: "Wpłać kwotę: Poduszka finansowa" }),
    ).toBeTruthy();
  });

  it("passes the goal and the clicked button to the handler", () => {
    const onDeposit = vi.fn<GoalDepositHandler>();
    renderCard(OVERDUE_GOAL, onDeposit);

    const button = screen.getByRole("button", {
      name: "Wpłać kwotę: Nowy laptop",
    });
    fireEvent.click(button);

    expect(onDeposit).toHaveBeenCalledTimes(1);
    expect(onDeposit).toHaveBeenCalledWith(OVERDUE_GOAL, button);
  });
});
