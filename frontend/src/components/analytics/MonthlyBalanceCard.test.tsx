import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MonthlyBalanceCard } from "@/components/analytics/MonthlyBalanceCard";
import type { UseMonthlyBalanceResult } from "@/hooks/useMonthlyBalance";
import { EMPTY_BALANCE, TEST_BALANCE } from "@/test-utils/monthlyBalance";

const useMonthlyBalanceMock = vi.hoisted(() =>
  vi.fn<(months: number) => UseMonthlyBalanceResult>(),
);

vi.mock("@/hooks/useMonthlyBalance", () => ({
  useMonthlyBalance: useMonthlyBalanceMock,
}));

const retryMock = vi.fn();

// jsdom has no ResizeObserver; the chart only needs one to exist here (its size is tested in MonthlyBalanceChart.test.tsx).
class NoopResizeObserver {
  observe(): void {}

  unobserve(): void {}

  disconnect(): void {}
}

function renderCard(state: UseMonthlyBalanceResult["state"]) {
  useMonthlyBalanceMock.mockReturnValue({ state, retry: retryMock });
  return render(<MonthlyBalanceCard months={3} />);
}

describe("MonthlyBalanceCard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("ResizeObserver", NoopResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("asks for the number of months it was given", () => {
    renderCard({ status: "loading" });

    expect(useMonthlyBalanceMock).toHaveBeenCalledWith(3);
  });

  it("shows a skeleton while loading", () => {
    renderCard({ status: "loading" });

    expect(screen.getByRole("status").textContent).toBe(
      "Ładowanie: zestawienia miesięcznego",
    );
  });

  it("offers a retry after an error", () => {
    renderCard({ status: "error" });

    fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));

    expect(retryMock).toHaveBeenCalledTimes(1);
  });

  it("shows an empty state instead of a chart when all amounts are zero", () => {
    renderCard({ status: "ready", rows: EMPTY_BALANCE });

    expect(screen.getByText("Brak transakcji w tym okresie")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Przejdź do transakcji" })
        .getAttribute("href"),
    ).toBe("/transactions");
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("shows the chart when there are amounts", () => {
    renderCard({ status: "ready", rows: TEST_BALANCE });

    expect(screen.getByRole("list", { name: "Legenda wykresu" })).toBeTruthy();
    expect(screen.getByRole("table")).toBeTruthy();
  });

  it("renders nothing while idle", () => {
    const { container } = renderCard({ status: "idle" });

    expect(container.innerHTML).toBe("");
  });
});
