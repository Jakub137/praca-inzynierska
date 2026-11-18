import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps, MouseEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { SidebarNav } from "@/components/layout/SidebarNav";

const usePathnameMock = vi.hoisted(() => vi.fn<() => string>());

vi.mock("next/navigation", () => ({ usePathname: usePathnameMock }));

vi.mock("next/link", async () => {
  const { createElement } = await import("react");
  return {
    default: ({ href, children, onClick, ...rest }: ComponentProps<"a">) =>
      createElement(
        "a",
        {
          href,
          ...rest,
          onClick: (event: MouseEvent<HTMLAnchorElement>) => {
            event.preventDefault();
            onClick?.(event);
          },
        },
        children,
      ),
  };
});

function renderNav(pathname: string, onNavigate?: () => void) {
  usePathnameMock.mockReturnValue(pathname);
  render(<SidebarNav onNavigate={onNavigate} />);
  return within(screen.getByRole("navigation", { name: "Menu główne" }));
}

function currentLinks(nav: ReturnType<typeof renderNav>) {
  return nav
    .getAllByRole("link")
    .filter((link) => link.getAttribute("aria-current") === "page");
}

describe("SidebarNav", () => {
  it("renders the six links with the labels from the mockup", () => {
    const nav = renderNav("/dashboard");

    expect(nav.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Strona Główna",
      "Transakcje",
      "Budżet i Limity",
      "Cele Oszczędnościowe",
      "Analityka i Raporty",
      "Płatności Cykliczne",
    ]);
  });

  it("marks only the current page with aria-current", () => {
    const nav = renderNav("/transactions");
    const current = currentLinks(nav);

    expect(current).toHaveLength(1);
    expect(current[0]?.textContent).toBe("Transakcje");
  });

  it("keeps the section active on a nested route", () => {
    const nav = renderNav("/budgets/new");

    expect(currentLinks(nav).map((link) => link.textContent)).toEqual([
      "Budżet i Limity",
    ]);
  });

  it("marks nothing as current on an unknown route", () => {
    const nav = renderNav("/settings");

    expect(currentLinks(nav)).toHaveLength(0);
  });

  it("gives the active link a green tint and ink text, others no tint", () => {
    const nav = renderNav("/dashboard");
    const active = nav.getByRole("link", { name: "Strona Główna" });
    const idle = nav.getByRole("link", { name: "Transakcje" });

    expect(active.classList.contains("bg-brand/10")).toBe(true);
    expect(active.classList.contains("text-ink")).toBe(true);
    expect(idle.classList.contains("bg-brand/10")).toBe(false);
  });

  it("calls onNavigate when a link is clicked", () => {
    const onNavigate = vi.fn();
    const nav = renderNav("/dashboard", onNavigate);

    fireEvent.click(nav.getByRole("link", { name: "Transakcje" }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
