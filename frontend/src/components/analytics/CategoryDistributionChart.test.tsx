import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryDistributionChart } from "@/components/analytics/CategoryDistributionChart";
import { TEST_DISTRIBUTION } from "@/test-utils/categoryDistribution";
import { stubChartEnvironment } from "@/test-utils/chartEnvironment";

const NBSP = " ";

function renderChart() {
  return render(<CategoryDistributionChart distribution={TEST_DISTRIBUTION} />);
}

function findPlot() {
  return screen.findByRole("application", {
    name: /okres: 01\.09\.2026 – 30\.11\.2026/,
  });
}

function sectors(container: HTMLElement): Element[] {
  return Array.from(container.querySelectorAll("path.recharts-sector"));
}

async function waitForSectors(container: HTMLElement) {
  await waitFor(() => expect(sectors(container)).toHaveLength(3));
}

function opacities(container: HTMLElement) {
  return sectors(container).map((sector) =>
    sector.getAttribute("fill-opacity"),
  );
}

function shape(container: HTMLElement, index: number) {
  return sectors(container)[index].getAttribute("d");
}

function legendItems() {
  return within(
    screen.getByRole("list", { name: "Legenda wykresu kategorii" }),
  ).getAllByRole("button");
}

function tooltipText(): string {
  return screen.getByRole("status").textContent ?? "";
}

describe("CategoryDistributionChart", () => {
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

  it("shows the total expenses in the middle", () => {
    renderChart();

    expect(screen.getByText("Razem").nextElementSibling?.textContent).toBe(
      `7${NBSP}450,50 zł`,
    );
  });

  it("lists every category with its amount and share in the legend", () => {
    renderChart();

    const texts = legendItems().map((item) => item.textContent);

    expect(texts).toHaveLength(3);
    expect(texts[0]).toContain("Rachunki");
    expect(texts[0]).toContain(`4${NBSP}000,00 zł · 53,69%`);
    expect(texts[2]).toContain("Hobby");
    expect(texts[2]).toContain("30,00 zł · 0,40%");
  });

  it("gives each segment and its legend marker the same colour and pattern", async () => {
    const { container } = renderChart();
    await waitForSectors(container);

    const [first, second] = sectors(container);
    const [firstItem, secondItem] = legendItems();

    expect(first.getAttribute("fill")).toBe("var(--color-chart-1)");
    expect(firstItem.querySelector("svg > rect")?.getAttribute("fill")).toBe(
      "var(--color-chart-1)",
    );
    expect(second.getAttribute("fill")).toMatch(/^url\(#/);
    expect(
      secondItem.querySelector("pattern > rect")?.getAttribute("fill"),
    ).toBe("var(--color-chart-2)");
    expect(
      secondItem.querySelector("svg > rect")?.getAttribute("fill"),
    ).toMatch(/^url\(#/);
  });

  it("highlights the segment of a hovered legend row", async () => {
    const { container } = renderChart();
    await waitForSectors(container);
    const usualShape = shape(container, 1);

    fireEvent.mouseEnter(legendItems()[1]);

    await waitFor(() =>
      expect(opacities(container)).toEqual(["0.35", "1", "0.35"]),
    );
    expect(shape(container, 1)).not.toBe(usualShape);

    fireEvent.mouseLeave(legendItems()[1]);

    await waitFor(() => expect(opacities(container)).toEqual(["1", "1", "1"]));
    expect(shape(container, 1)).toBe(usualShape);
  });

  it("highlights the segment of a focused legend row", async () => {
    const { container } = renderChart();
    await waitForSectors(container);

    fireEvent.focus(legendItems()[2]);

    await waitFor(() =>
      expect(opacities(container)).toEqual(["0.35", "0.35", "1"]),
    );

    fireEvent.blur(legendItems()[2]);

    await waitFor(() => expect(opacities(container)).toEqual(["1", "1", "1"]));
  });

  it("shows the name, amount and share of a pointed segment", async () => {
    const { container } = renderChart();
    await waitForSectors(container);

    fireEvent.mouseEnter(
      container.querySelectorAll("g.recharts-pie-sector")[1],
    );

    await waitFor(() => expect(tooltipText()).toContain("Artykuły spożywcze"));
    expect(tooltipText()).toContain(`Kwota: 3${NBSP}420,50 zł`);
    expect(tooltipText()).toContain("Udział: 45,91%");
  });

  it("shows the tooltip category by category from the keyboard", async () => {
    renderChart();
    const plot = await findPlot();

    fireEvent.focus(plot);

    await waitFor(() => expect(tooltipText()).toContain("Rachunki"));
    expect(tooltipText()).toContain("Udział: 53,69%");

    fireEvent.keyDown(plot, { key: "ArrowRight" });

    await waitFor(() => expect(tooltipText()).toContain("Artykuły spożywcze"));
  });

  it("lists every category in a table for screen readers", () => {
    renderChart();

    const table = screen.getByRole("table", {
      name: "Udział kategorii w wydatkach",
    });
    const rows = within(table).getAllByRole("row");

    expect(rows).toHaveLength(TEST_DISTRIBUTION.categories.length + 1);
    expect(rows[3].textContent).toContain("Hobby");
    expect(rows[3].textContent).toContain("0,40%");
  });
});
