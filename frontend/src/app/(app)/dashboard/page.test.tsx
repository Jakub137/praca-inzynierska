import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardPage, { metadata } from "@/app/(app)/dashboard/page";

vi.mock("@/components/dashboard/DashboardView", () => ({
  DashboardView: () => <p>Widok strony głównej</p>,
}));

describe("DashboardPage", () => {
  it("renders the dashboard view", () => {
    render(<DashboardPage />);

    expect(screen.getByText("Widok strony głównej")).toBeDefined();
  });

  it("sets the page title for the %s | Saldo template", () => {
    expect(metadata.title).toBe("Strona Główna");
  });
});
