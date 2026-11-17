import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { AuthShell } from "@/components/auth/AuthShell";

const usePathnameMock = vi.hoisted(() => vi.fn<() => string>());

vi.mock("next/navigation", () => ({ usePathname: usePathnameMock }));

function renderShell(pathname: string) {
  usePathnameMock.mockReturnValue(pathname);
  const { container } = render(
    <AuthShell panel={<p>Panel</p>}>
      <p>Formularz</p>
    </AuthShell>,
  );

  return {
    root: container.firstElementChild,
    panelColumn: screen.getByText("Panel").parentElement,
    formColumn: screen.getByText("Formularz").parentElement,
  };
}

describe("AuthShell", () => {
  test("on /login moves the panel to the right and the form to the left", () => {
    const { panelColumn, formColumn } = renderShell("/login");

    expect(panelColumn?.classList.contains("lg:translate-x-full")).toBe(true);
    expect(formColumn?.classList.contains("lg:-translate-x-full")).toBe(true);
  });

  test("on /register keeps the panel on the left and the form on the right", () => {
    const { panelColumn, formColumn } = renderShell("/register");

    expect(panelColumn?.classList.contains("lg:translate-x-0")).toBe(true);
    expect(formColumn?.classList.contains("lg:translate-x-0")).toBe(true);
    expect(panelColumn?.classList.contains("lg:translate-x-full")).toBe(false);
    expect(formColumn?.classList.contains("lg:-translate-x-full")).toBe(false);
  });

  test("disables the transition for reduced motion in both columns", () => {
    const { panelColumn, formColumn } = renderShell("/login");

    expect(
      panelColumn?.classList.contains("motion-reduce:transition-none"),
    ).toBe(true);
    expect(
      formColumn?.classList.contains("motion-reduce:transition-none"),
    ).toBe(true);
  });

  test("applies translation only from the desktop breakpoint", () => {
    const { panelColumn, formColumn } = renderShell("/login");

    for (const column of [panelColumn, formColumn]) {
      const translateClasses = [...(column?.classList ?? [])].filter((name) =>
        name.includes("translate"),
      );

      expect(translateClasses.length).toBeGreaterThan(0);
      expect(translateClasses.every((name) => name.startsWith("lg:"))).toBe(
        true,
      );
    }
  });

  test("hides the panel below the desktop breakpoint", () => {
    const { panelColumn } = renderShell("/login");

    expect(panelColumn?.classList.contains("hidden")).toBe(true);
    expect(panelColumn?.classList.contains("lg:flex")).toBe(true);
  });

  test("keeps the panel above the form while the columns cross", () => {
    const { panelColumn, formColumn } = renderShell("/login");

    expect(panelColumn?.classList.contains("lg:z-10")).toBe(true);
    expect(
      [...(formColumn?.classList ?? [])].some((name) => name.includes("z-")),
    ).toBe(false);
  });

  test("clips horizontal overflow without creating a scroll container", () => {
    const { root } = renderShell("/login");

    expect(root?.classList.contains("overflow-x-clip")).toBe(true);
    expect(root?.classList.contains("overflow-hidden")).toBe(false);
  });

  test("renders the panel and the page inside a single main landmark", () => {
    renderShell("/register");

    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByRole("main").contains(screen.getByText("Panel"))).toBe(
      true,
    );
    expect(
      screen.getByRole("main").contains(screen.getByText("Formularz")),
    ).toBe(true);
  });
});
