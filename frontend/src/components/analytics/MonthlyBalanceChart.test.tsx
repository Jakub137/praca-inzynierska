import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MonthlyBalanceChart } from "@/components/analytics/MonthlyBalanceChart";
import { stubChartEnvironment } from "@/test-utils/chartEnvironment";
import { TEST_BALANCE } from "@/test-utils/monthlyBalance";

function renderChart() {
  return render(<MonthlyBalanceChart rows={TEST_BALANCE} />);
}

function findPlot() {
  return screen.findByRole("application", {
    name: /okres: wrzesień 2026 – listopad 2026/,
  });
}

function tooltipText(): string {
  return screen.getByRole("status").textContent ?? "";
}

describe("MonthlyBalanceChart", () => {
  beforeEach(() => {
    stubChartEnvironment();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is a focusable chart named with its period", async () => {
    renderChart();

    const plot = await findPlot();

    expect(plot.getAttribute("tabindex")).toBe("0");
  });

  it("has a text legend for both series", () => {
    renderChart();

    const legend = screen.getByRole("list", { name: "Legenda wykresu" });

    expect(
      within(legend)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Przychody", "Wydatki"]);
  });

  it("draws solid income bars and striped expense bars", async () => {
    const { container } = renderChart();
    const plot = await findPlot();
    const patternId = plot.querySelector("pattern")?.id;

    await waitFor(() => {
      expect(
        container.querySelectorAll(
          'path.recharts-rectangle[fill="var(--color-success)"]',
        ).length,
      ).toBeGreaterThan(0);
      expect(
        container.querySelectorAll(
          `path.recharts-rectangle[fill="url(#${patternId})"]`,
        ).length,
      ).toBeGreaterThan(0);
    });
  });

  it("shows exact amounts in the tooltip, month by month, from the keyboard", async () => {
    renderChart();
    const plot = await findPlot();

    fireEvent.focus(plot);

    await waitFor(() => expect(tooltipText()).toContain("wrzesień 2026"));
    expect(tooltipText()).toContain("Przychody: 8 000,00 zł");
    expect(tooltipText()).toContain("Wydatki: 5 200,50 zł");

    fireEvent.keyDown(plot, { key: "ArrowRight" });

    await waitFor(() => expect(tooltipText()).toContain("październik 2026"));
    expect(tooltipText()).toContain("Przychody: 0,00 zł");
  });

  it("lists every month in a table for screen readers", () => {
    renderChart();

    const table = screen.getByRole("table", {
      name: "Przychody i wydatki w kolejnych miesiącach",
    });
    const rows = within(table).getAllByRole("row");

    expect(rows).toHaveLength(TEST_BALANCE.length + 1);
    expect(rows[3].textContent).toContain("listopad 2026");
    expect(rows[3].textContent).toContain("12 500,00 zł");
    expect(rows[3].textContent).toContain("2 250,00 zł");
  });
});
