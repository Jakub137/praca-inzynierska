import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBar, type ProgressBarTone } from "@/components/ui/ProgressBar";

const LABEL = "Wykorzystanie limitu: Rozrywka";

type BarOptions = {
  value: number;
  max: number;
  tone?: ProgressBarTone;
  valueText?: string;
};

function renderBar({ value, max, tone, valueText }: BarOptions) {
  render(
    <ProgressBar
      label={LABEL}
      value={value}
      max={max}
      tone={tone}
      valueText={valueText}
    />,
  );
  const bar = screen.getByRole("progressbar", { name: LABEL });
  return { bar, fill: bar.firstElementChild as HTMLElement };
}

describe("ProgressBar", () => {
  it("exposes the progressbar attributes and the accessible name", () => {
    const { bar } = renderBar({ value: 40, max: 200 });

    expect(bar.getAttribute("aria-valuenow")).toBe("40");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("200");
  });

  it("fills the bar proportionally to value and max", () => {
    const { fill } = renderBar({ value: 40, max: 200 });

    expect(fill.style.width).toBe("20%");
  });

  it("exposes the spoken text when given", () => {
    const { bar } = renderBar({
      value: 76,
      max: 100,
      valueText: "tekst pomocniczy",
    });

    expect(bar.getAttribute("aria-valuetext")).toBe("tekst pomocniczy");
  });

  it("omits aria-valuetext when not given", () => {
    const { bar } = renderBar({ value: 76, max: 100 });

    expect(bar.hasAttribute("aria-valuetext")).toBe(false);
  });

  it("stops at max when the value is above it", () => {
    const { bar, fill } = renderBar({ value: 250, max: 200 });

    expect(bar.getAttribute("aria-valuenow")).toBe("200");
    expect(fill.style.width).toBe("100%");
  });

  it("clamps a negative value to zero", () => {
    const { bar, fill } = renderBar({ value: -5, max: 100 });

    expect(bar.getAttribute("aria-valuenow")).toBe("0");
    expect(fill.style.width).toBe("0%");
  });

  it.each([0, -10])("keeps the bar empty when max is %s", (max) => {
    const { bar, fill } = renderBar({ value: 10, max });

    expect(bar.getAttribute("aria-valuenow")).toBe("0");
    expect(fill.style.width).toBe("0%");
  });

  it.each<[ProgressBarTone, string]>([
    ["brand", "bg-brand"],
    ["warning", "bg-warning"],
    ["danger", "bg-danger"],
  ])("colours the %s tone with %s", (tone, expectedClass) => {
    const { fill } = renderBar({ value: 50, max: 100, tone });

    expect(fill.className).toContain(expectedClass);
  });

  it("uses the brand tone by default", () => {
    const { fill } = renderBar({ value: 50, max: 100 });

    expect(fill.className).toContain("bg-brand");
  });

  it("keeps the neutral track behind the fill", () => {
    const { bar } = renderBar({ value: 50, max: 100 });

    expect(bar.className).toContain("bg-line");
  });
});
