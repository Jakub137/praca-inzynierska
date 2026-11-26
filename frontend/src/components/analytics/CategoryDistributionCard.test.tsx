import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryDistributionCard } from "@/components/analytics/CategoryDistributionCard";
import type { UseCategoryDistributionResult } from "@/hooks/useCategoryDistribution";
import {
  EMPTY_DISTRIBUTION,
  TEST_DISTRIBUTION,
} from "@/test-utils/categoryDistribution";
import { stubChartEnvironment } from "@/test-utils/chartEnvironment";

const useCategoryDistributionMock = vi.hoisted(() =>
  vi.fn<(months: number) => UseCategoryDistributionResult>(),
);

vi.mock("@/hooks/useCategoryDistribution", () => ({
  useCategoryDistribution: useCategoryDistributionMock,
}));

const retryMock = vi.fn();

function renderCard(state: UseCategoryDistributionResult["state"]) {
  useCategoryDistributionMock.mockReturnValue({ state, retry: retryMock });
  return render(<CategoryDistributionCard months={3} />);
}

describe("CategoryDistributionCard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    stubChartEnvironment();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("asks for the number of months it was given", () => {
    renderCard({ status: "loading" });

    expect(useCategoryDistributionMock).toHaveBeenCalledWith(3);
  });

  it("shows a skeleton while loading", () => {
    renderCard({ status: "loading" });

    expect(screen.getByRole("status").textContent).toBe(
      "Ładowanie: rozkładu wydatków",
    );
  });

  it("offers a retry after an error", () => {
    renderCard({ status: "error" });

    fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));

    expect(retryMock).toHaveBeenCalledTimes(1);
  });

  it("shows an empty state instead of a chart when there are no expenses", () => {
    renderCard({ status: "ready", distribution: EMPTY_DISTRIBUTION });

    expect(screen.getByText("Brak wydatków w tym okresie")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Przejdź do transakcji" })
        .getAttribute("href"),
    ).toBe("/transactions");
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("shows the chart when there are expenses", () => {
    renderCard({ status: "ready", distribution: TEST_DISTRIBUTION });

    expect(
      screen.getByRole("list", { name: "Legenda wykresu kategorii" }),
    ).toBeTruthy();
    expect(screen.getByRole("table")).toBeTruthy();
  });

  it("renders nothing while idle", () => {
    const { container } = renderCard({ status: "idle" });

    expect(container.innerHTML).toBe("");
  });
});
