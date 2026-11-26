import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import type { AnalyticsMonths } from "@/lib/analytics/period";

const pushMock = vi.hoisted(() => vi.fn());
const useMonthlyBalanceMock = vi.hoisted(() => vi.fn());
const useCategoryDistributionMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// The balance card loads its own data; here it only has to stay in the loading state.
vi.mock("@/hooks/useMonthlyBalance", () => ({
  useMonthlyBalance: useMonthlyBalanceMock.mockReturnValue({
    state: { status: "loading" },
    retry: vi.fn(),
  }),
}));

vi.mock("@/hooks/useCategoryDistribution", () => ({
  useCategoryDistribution: useCategoryDistributionMock.mockReturnValue({
    state: { status: "loading" },
    retry: vi.fn(),
  }),
}));

function periodSelect(): HTMLSelectElement {
  return screen.getByLabelText("Okres") as HTMLSelectElement;
}

function choosePeriod(value: string) {
  fireEvent.change(periodSelect(), { target: { value } });
}

function renderView(months: AnalyticsMonths = 6) {
  return render(<AnalyticsView months={months} />);
}

describe("AnalyticsView period filter", () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it("offers three periods with the given one selected", () => {
    renderView(12);

    const select = periodSelect();
    expect(Array.from(select.options, (option) => option.text)).toEqual([
      "Ostatnie 3 miesiące",
      "Ostatnie 6 miesięcy",
      "Ostatnie 12 miesięcy",
    ]);
    expect(select.value).toBe("12");
    expect(select.className).toContain("border-input-border");
  });

  it("puts a chosen period into the address", () => {
    renderView();

    choosePeriod("3");

    expect(pushMock).toHaveBeenCalledWith("/analytics?months=3", {
      scroll: false,
    });
  });

  it("clears the address when the default period is chosen again", () => {
    renderView(3);

    choosePeriod("6");

    expect(pushMock).toHaveBeenCalledWith("/analytics", { scroll: false });
  });

  it("shows the chosen period before the address changes", () => {
    renderView();

    choosePeriod("3");

    expect(periodSelect().value).toBe("3");
  });

  it("follows the address again after going back", () => {
    const { rerender } = renderView(6);
    choosePeriod("3");
    rerender(<AnalyticsView months={3} />);

    rerender(<AnalyticsView months={6} />);

    expect(periodSelect().value).toBe("6");
  });
});

describe("AnalyticsView chart cards", () => {
  it("renders two chart cards as named regions", () => {
    renderView();

    expect(
      screen.getByRole("region", { name: "Przychody i wydatki" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "Wydatki według kategorii" }),
    ).toBeTruthy();
  });

  it("asks for the monthly balance of the chosen period", () => {
    renderView(12);

    expect(useMonthlyBalanceMock).toHaveBeenLastCalledWith(12);
  });

  it("asks for the category distribution of the chosen period", () => {
    renderView(12);

    expect(useCategoryDistributionMock).toHaveBeenLastCalledWith(12);
  });
});
