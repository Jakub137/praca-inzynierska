import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import AuthLayout from "@/app/(auth)/layout";

vi.mock("next/navigation", () => ({ usePathname: () => "/login" }));

describe("AuthLayout", () => {
  test("renders the three brand features next to the page", () => {
    render(
      <AuthLayout>
        <p>Zawartość strony</p>
      </AuthLayout>,
    );

    expect(screen.getByText("Zawartość strony")).toBeDefined();
    for (const title of [
      "Inteligentna analiza wydatków",
      "Kontrola budżetu",
      "Cele oszczędnościowe",
    ]) {
      expect(screen.getByText(title)).toBeDefined();
    }
  });
});
