import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps, MouseEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/AppShell";
import type { CurrencyRatesState } from "@/hooks/useCurrencyRates";
import { AuthContext } from "@/lib/auth/authContext";
import { makeAuthValue } from "@/test-utils/authContextValue";
import { TEST_RATES } from "@/test-utils/currencyRates";

const usePathnameMock = vi.hoisted(() => vi.fn<() => string>());
const useCurrencyRatesMock = vi.hoisted(() =>
  vi.fn<() => CurrencyRatesState>(),
);

vi.mock("next/navigation", () => ({ usePathname: usePathnameMock }));

vi.mock("@/hooks/useCurrencyRates", () => ({
  useCurrencyRates: useCurrencyRatesMock,
}));

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

function renderShell() {
  usePathnameMock.mockReturnValue("/dashboard");
  useCurrencyRatesMock.mockReturnValue({ status: "ready", rates: TEST_RATES });
  render(
    <AuthContext.Provider value={makeAuthValue()}>
      <AppShell>
        <p>Treść strony</p>
      </AppShell>
    </AuthContext.Provider>,
  );
}

function drawer() {
  return screen.getByRole("dialog", { hidden: true });
}

function openDrawer() {
  fireEvent.click(screen.getByRole("button", { name: "Otwórz menu" }));
}

describe("AppShell", () => {
  it("renders the page inside a single main landmark with a skip link", () => {
    renderShell();

    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(
      screen.getByRole("main").contains(screen.getByText("Treść strony")),
    ).toBe(true);
    expect(
      screen
        .getByRole("link", { name: "Przejdź do treści" })
        .getAttribute("href"),
    ).toBe("#main-content");
  });

  it("starts with a collapsed menu button wired to a hidden drawer", () => {
    renderShell();
    const button = screen.getByRole("button", { name: "Otwórz menu" });

    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.getAttribute("aria-controls")).toBe(drawer().id);
    expect(drawer().hidden).toBe(true);
  });

  it("opens the drawer, sets aria-expanded and moves focus into it", () => {
    renderShell();
    openDrawer();

    expect(
      screen
        .getByRole("button", { name: "Otwórz menu" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
    expect(drawer().hidden).toBe(false);
    expect(document.activeElement).toBe(
      within(drawer()).getByRole("button", { name: "Zamknij menu" }),
    );
  });

  it("makes the rest of the page inert while the drawer is open", () => {
    renderShell();
    const content = screen.getByText("Treść strony");

    expect(content.closest("[inert]")).toBeNull();

    openDrawer();

    expect(content.closest("[inert]")).not.toBeNull();
    expect(drawer().closest("[inert]")).toBeNull();
  });

  it("closes on Escape and returns focus to the menu button", () => {
    renderShell();
    openDrawer();

    fireEvent.keyDown(document, { key: "Escape" });

    const button = screen.getByRole("button", { name: "Otwórz menu" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(drawer().hidden).toBe(true);
    expect(document.activeElement).toBe(button);
  });

  it("closes on the close button and returns focus to the menu button", () => {
    renderShell();
    openDrawer();

    fireEvent.click(
      within(drawer()).getByRole("button", { name: "Zamknij menu" }),
    );

    expect(drawer().hidden).toBe(true);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Otwórz menu" }),
    );
  });

  it("closes when the backdrop is clicked", () => {
    renderShell();
    openDrawer();
    const [backdrop] = within(drawer()).getAllByRole("button", {
      hidden: true,
    });

    fireEvent.click(backdrop as HTMLElement);

    expect(drawer().hidden).toBe(true);
  });

  it("closes after a link in the drawer is clicked", () => {
    renderShell();
    openDrawer();

    fireEvent.click(within(drawer()).getByRole("link", { name: "Transakcje" }));

    expect(drawer().hidden).toBe(true);
  });

  it("renders the currency pill in the header after the menu button", () => {
    renderShell();
    const menuButton = screen.getByRole("button", { name: "Otwórz menu" });
    const pill = within(screen.getByRole("banner")).getByRole("button", {
      name: /^NBP: 1 EUR/,
    });

    expect(
      menuButton.compareDocumentPosition(pill) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(pill.closest(".ml-auto")).not.toBeNull();
  });
});
