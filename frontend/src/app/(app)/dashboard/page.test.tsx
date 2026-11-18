import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DashboardPage, { metadata } from "@/app/(app)/dashboard/page";

describe("DashboardPage", () => {
  it("renders the page heading", () => {
    render(<DashboardPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Strona Główna" }),
    ).toBeDefined();
  });

  it("sets the page title for the %s | Saldo template", () => {
    expect(metadata.title).toBe("Strona Główna");
  });
});
