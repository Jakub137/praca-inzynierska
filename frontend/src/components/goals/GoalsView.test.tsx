import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoalsView } from "@/components/goals/GoalsView";
import type {
  SavingsGoalsState,
  UseSavingsGoalsResult,
} from "@/hooks/useSavingsGoals";
import { TEST_GOALS, TEST_TODAY } from "@/test-utils/goals";

const useSavingsGoalsMock = vi.hoisted(() =>
  vi.fn<() => UseSavingsGoalsResult>(),
);

vi.mock("@/hooks/useSavingsGoals", () => ({
  useSavingsGoals: useSavingsGoalsMock,
}));

function renderView(state: SavingsGoalsState, retry: () => void = vi.fn()) {
  useSavingsGoalsMock.mockReturnValue({ state, retry });
  return render(<GoalsView />);
}

describe("GoalsView", () => {
  beforeEach(() => {
    useSavingsGoalsMock.mockReset();
  });

  it("renders nothing while the user is not authenticated", () => {
    const { container } = renderView({ status: "idle" });

    expect(container.innerHTML).toBe("");
  });

  it("shows the loading skeleton", () => {
    renderView({ status: "loading" });

    expect(screen.getByRole("status").textContent).toBe("Ładowanie celów");
  });

  it("shows an error with a retry button", () => {
    const retry = vi.fn();
    renderView({ status: "error" }, retry);

    expect(screen.getByRole("alert").textContent).toBe(
      "Nie udało się wczytać celów.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("shows a text message instead of an empty grid", () => {
    renderView({ status: "ready", goals: [], today: TEST_TODAY });

    expect(
      screen.getByRole("heading", { name: "Brak celów oszczędnościowych" }),
    ).toBeTruthy();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("renders one card per goal in the order of the API", () => {
    renderView({ status: "ready", goals: TEST_GOALS, today: TEST_TODAY });

    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
    ).toEqual([
      "Wakacje we Włoszech",
      "Nowy laptop",
      "Rower",
      "Poduszka finansowa",
    ]);
  });

  it("gives every card the date read by the hook", () => {
    renderView({ status: "ready", goals: TEST_GOALS, today: TEST_TODAY });

    expect(screen.getByText(/Termin minął/)).toBeTruthy();
    expect(screen.getByText(/Termin w ciągu miesiąca/)).toBeTruthy();
  });

  it("has no new-goal button yet: it arrives with the dialog in T-061", () => {
    renderView({ status: "ready", goals: TEST_GOALS, today: TEST_TODAY });

    expect(screen.queryByRole("button")).toBeNull();
  });
});
