import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BudgetProgressBar } from "@/components/budgets/BudgetProgressBar";
import type { BudgetStatus } from "@/types/api";

const LABEL = "Wykorzystanie limitu: Rozrywka";

function renderBar(percentage: number, status: BudgetStatus = "NORMAL") {
  render(
    <BudgetProgressBar
      label={LABEL}
      percentage={percentage}
      status={status}
      valueText="tekst pomocniczy"
    />,
  );
  const bar = screen.getByRole("progressbar", { name: LABEL });
  return { bar, fill: bar.firstElementChild as HTMLElement };
}

describe("BudgetProgressBar", () => {
  it("exposes the progressbar attributes and the spoken text", () => {
    const { bar } = renderBar(76);

    expect(bar.getAttribute("aria-valuenow")).toBe("76");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
    expect(bar.getAttribute("aria-valuetext")).toBe("tekst pomocniczy");
  });

  it("fills the bar to the given percentage", () => {
    const { fill } = renderBar(76);

    expect(fill.style.width).toBe("76%");
  });

  it("stops at 100 when the limit is exceeded", () => {
    const { bar, fill } = renderBar(184.2, "EXCEEDED");

    expect(bar.getAttribute("aria-valuenow")).toBe("100");
    expect(fill.style.width).toBe("100%");
  });

  it.each<[BudgetStatus, string]>([
    ["NORMAL", "bg-brand"],
    ["WARNING", "bg-warning"],
    ["EXCEEDED", "bg-danger"],
  ])("colours the %s status with %s", (status, expectedClass) => {
    const { fill } = renderBar(50, status);

    expect(fill.className).toContain(expectedClass);
  });

  it("keeps the neutral track behind the fill", () => {
    const { bar } = renderBar(50);

    expect(bar.className).toContain("bg-line");
  });
});
