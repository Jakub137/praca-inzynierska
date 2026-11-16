import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import LoginPage from "@/app/(auth)/login/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

type SearchParams = { [key: string]: string | string[] | undefined };

async function renderPage(query: SearchParams = {}) {
  render(await LoginPage({ searchParams: Promise.resolve(query) }));
}

describe("LoginPage", () => {
  test("renders the heading and the login fields", async () => {
    await renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Witaj ponownie" }),
    ).toBeDefined();
    expect(screen.getByLabelText("Adres e-mail")).toBeDefined();
    expect(screen.getByLabelText("Hasło")).toBeDefined();
    expect(screen.getByLabelText("Zapamiętaj mnie")).toBeDefined();
    expect(screen.getByRole("button", { name: "Zaloguj się" })).toBeDefined();
  });

  test("renders the three brand features", async () => {
    await renderPage();

    for (const title of [
      "Inteligentna analiza wydatków",
      "Kontrola budżetu",
      "Cele oszczędnościowe",
    ]) {
      expect(screen.getByText(title)).toBeDefined();
    }
  });

  test("disables native validation", async () => {
    await renderPage();

    expect(
      screen
        .getByRole("button", { name: "Zaloguj się" })
        .closest("form")
        ?.hasAttribute("novalidate"),
    ).toBe(true);
  });

  test("shows the success notice for registered=1", async () => {
    await renderPage({ registered: "1" });

    expect(screen.getByRole("status").textContent).toBe(
      "Konto zostało utworzone. Zaloguj się.",
    );
  });

  test.each([
    ["no query", {}],
    ["another value", { registered: "0" }],
    ["a repeated parameter", { registered: ["1", "1"] }],
  ])("shows no notice for %s", async (_name, query) => {
    await renderPage(query);

    expect(screen.queryByRole("status")).toBeNull();
  });
});
