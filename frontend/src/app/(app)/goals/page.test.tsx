import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GoalsPage, { metadata } from "@/app/(app)/goals/page";
import type { UseSavingsGoalsResult } from "@/hooks/useSavingsGoals";

const useSavingsGoalsMock = vi.hoisted(() =>
  vi.fn<() => UseSavingsGoalsResult>(),
);

vi.mock("@/hooks/useSavingsGoals", () => ({
  useSavingsGoals: useSavingsGoalsMock,
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

describe("GoalsPage", () => {
  beforeEach(() => {
    useSavingsGoalsMock.mockReset();
    useSavingsGoalsMock.mockReturnValue({
      state: { status: "loading" },
      retry: vi.fn(),
    });
  });

  it("renders the page heading", () => {
    render(<GoalsPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Cele Oszczędnościowe",
      }),
    ).toBeTruthy();
  });

  it("renders the goals view", () => {
    render(<GoalsPage />);

    expect(screen.getByRole("status").textContent).toBe("Ładowanie celów");
  });

  it("sets the page title for the %s | Saldo template", () => {
    expect(metadata.title).toBe("Cele Oszczędnościowe");
  });
});
