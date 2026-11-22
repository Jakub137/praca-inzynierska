import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardView } from "@/components/dashboard/DashboardView";
import type {
  BudgetUsageState,
  UseBudgetUsageResult,
} from "@/hooks/useBudgetUsage";
import type {
  DashboardSummaryState,
  UseDashboardSummaryResult,
} from "@/hooks/useDashboardSummary";
import type {
  RecentTransactionsState,
  UseRecentTransactionsResult,
} from "@/hooks/useRecentTransactions";
import type {
  SavingsGoalsState,
  UseSavingsGoalsResult,
} from "@/hooks/useSavingsGoals";
import { TEST_BUDGET_USAGE } from "@/test-utils/budgets";
import { TEST_SUMMARY } from "@/test-utils/dashboard";
import { TEST_GOALS, TEST_TODAY } from "@/test-utils/goals";
import { makePage, TEST_TRANSACTIONS } from "@/test-utils/transactions";

const useDashboardSummaryMock = vi.hoisted(() =>
  vi.fn<() => UseDashboardSummaryResult>(),
);
const useSavingsGoalsMock = vi.hoisted(() =>
  vi.fn<() => UseSavingsGoalsResult>(),
);
const useRecentTransactionsMock = vi.hoisted(() =>
  vi.fn<() => UseRecentTransactionsResult>(),
);
const useBudgetUsageMock = vi.hoisted(() =>
  vi.fn<(month: string | null) => UseBudgetUsageResult>(),
);

vi.mock("@/hooks/useDashboardSummary", () => ({
  useDashboardSummary: useDashboardSummaryMock,
}));
vi.mock("@/hooks/useSavingsGoals", () => ({
  useSavingsGoals: useSavingsGoalsMock,
}));
vi.mock("@/hooks/useRecentTransactions", () => ({
  RECENT_TRANSACTIONS_COUNT: 5,
  useRecentTransactions: useRecentTransactionsMock,
}));
vi.mock("@/hooks/useBudgetUsage", () => ({
  useBudgetUsage: useBudgetUsageMock,
}));

type ViewStates = {
  summary: DashboardSummaryState;
  goals: SavingsGoalsState;
  transactions: RecentTransactionsState;
  budgets: BudgetUsageState;
};

const READY_STATES: ViewStates = {
  summary: { status: "ready", summary: TEST_SUMMARY },
  goals: { status: "ready", goals: TEST_GOALS, today: TEST_TODAY },
  transactions: { status: "ready", page: makePage(TEST_TRANSACTIONS) },
  budgets: { status: "ready", usage: TEST_BUDGET_USAGE },
};

function renderView(overrides: Partial<ViewStates> = {}) {
  const states = { ...READY_STATES, ...overrides };
  const retries = {
    summary: vi.fn(),
    goals: vi.fn(),
    transactions: vi.fn(),
    budgets: vi.fn(),
  };
  useDashboardSummaryMock.mockReturnValue({
    state: states.summary,
    retry: retries.summary,
  });
  useSavingsGoalsMock.mockReturnValue({
    state: states.goals,
    retry: retries.goals,
  });
  useRecentTransactionsMock.mockReturnValue({
    state: states.transactions,
    retry: retries.transactions,
  });
  useBudgetUsageMock.mockReturnValue({
    state: states.budgets,
    retry: retries.budgets,
  });
  const result = render(<DashboardView />);
  return { ...result, retries };
}

describe("DashboardView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders nothing while the user is not authenticated", () => {
    const { container } = renderView({ summary: { status: "idle" } });

    expect(container.innerHTML).toBe("");
  });

  it("shows the heading and the month from the API as a subtitle", () => {
    renderView();

    expect(
      screen.getByRole("heading", { level: 1, name: "Panel Finansowy" }),
    ).toBeDefined();
    expect(screen.getByText("Podsumowanie za listopad 2026")).toBeDefined();
  });

  it("shows the heading without a subtitle while the summary loads", () => {
    renderView({ summary: { status: "loading" } });

    expect(
      screen.getByRole("heading", { level: 1, name: "Panel Finansowy" }),
    ).toBeDefined();
    expect(screen.queryByText(/Podsumowanie za/)).toBeNull();
  });

  it("shows the four metric cards and the three widgets", () => {
    renderView();

    for (const name of [
      "Dostępne środki",
      "Wydatki w tym miesiącu",
      "Przychody w tym miesiącu",
      "Odłożone na cele",
    ]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeDefined();
    }
    for (const name of [
      "Ostatnie Transakcje",
      "Wykorzystanie Budżetu",
      "Główny Cel Oszczędnościowy",
    ]) {
      expect(screen.getByRole("region", { name })).toBeDefined();
    }
  });

  it("asks for the budget usage of the current month", () => {
    renderView();

    expect(useBudgetUsageMock).toHaveBeenCalledWith(null);
  });

  it("keeps the other widgets when one of them fails", () => {
    renderView({ transactions: { status: "error" } });

    expect(screen.getByRole("alert").textContent).toBe(
      "Nie udało się wczytać transakcji.",
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Dostępne środki" }),
    ).toBeDefined();
    expect(
      screen.getByRole("region", { name: "Wykorzystanie Budżetu" }),
    ).toBeDefined();
  });

  it("retries only the failed widget", () => {
    const { retries } = renderView({ budgets: { status: "error" } });

    fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));

    expect(retries.budgets).toHaveBeenCalledTimes(1);
    expect(retries.summary).not.toHaveBeenCalled();
    expect(retries.goals).not.toHaveBeenCalled();
    expect(retries.transactions).not.toHaveBeenCalled();
  });

  it("shows the goals error twice (card and widget) and retries the shared request", () => {
    const { retries } = renderView({ goals: { status: "error" } });

    expect(screen.getAllByRole("alert")).toHaveLength(2);
    const buttons = screen.getAllByRole("button", { name: "Spróbuj ponownie" });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[1]);

    expect(retries.goals).toHaveBeenCalledTimes(1);
  });
});
