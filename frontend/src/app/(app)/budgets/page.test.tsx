import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BudgetsPage, { metadata } from "@/app/(app)/budgets/page";
import type { UseBudgetUsageResult } from "@/hooks/useBudgetUsage";

const useBudgetUsageMock = vi.hoisted(() =>
  vi.fn<(month: string | null) => UseBudgetUsageResult>(),
);

vi.mock("@/hooks/useBudgetUsage", () => ({
  useBudgetUsage: useBudgetUsageMock,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

async function renderPage(
  searchParams: Record<string, string | string[] | undefined> = {},
) {
  render(await BudgetsPage({ searchParams: Promise.resolve(searchParams) }));
}

describe("BudgetsPage", () => {
  beforeEach(() => {
    useBudgetUsageMock.mockReset();
    useBudgetUsageMock.mockReturnValue({
      state: { status: "loading" },
      retry: vi.fn(),
    });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 19));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the page heading", async () => {
    await renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Budżet i Limity" }),
    ).toBeTruthy();
  });

  it("renders the budgets view", async () => {
    await renderPage();

    expect(screen.getByRole("status").textContent).toBe("Ładowanie limitów");
  });

  it("sets the page title for the %s | Saldo template", () => {
    expect(metadata.title).toBe("Budżet i Limity");
  });

  it("asks for the current month when the address has no month", async () => {
    await renderPage();

    expect(useBudgetUsageMock).toHaveBeenCalledWith(null);
    expect((screen.getByLabelText("Miesiąc") as HTMLSelectElement).value).toBe(
      "2026-11",
    );
  });

  it("reads a valid month from the address", async () => {
    await renderPage({ month: "2026-10" });

    expect(useBudgetUsageMock).toHaveBeenCalledWith("2026-10");
  });

  it.each(["2026-13", "abc", "2025-10"])(
    "treats the invalid or too old month %s like a missing one",
    async (month) => {
      await renderPage({ month });

      expect(useBudgetUsageMock).toHaveBeenCalledWith(null);
    },
  );
});
