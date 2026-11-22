import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecentTransactionsCard } from "@/components/dashboard/RecentTransactionsCard";
import type { RecentTransactionsState } from "@/hooks/useRecentTransactions";
import { makePage, TEST_TRANSACTIONS } from "@/test-utils/transactions";

const NBSP = "\u00a0";

function renderCard(state: RecentTransactionsState, onRetry = vi.fn()) {
  return render(<RecentTransactionsCard state={state} onRetry={onRetry} />);
}

const READY: RecentTransactionsState = {
  status: "ready",
  page: makePage(TEST_TRANSACTIONS, { totalElements: 42, size: 5 }),
};

describe("RecentTransactionsCard", () => {
  it("renders nothing while the user is not authenticated", () => {
    const { container } = renderCard({ status: "idle" });

    expect(container.innerHTML).toBe("");
  });

  it("shows a named skeleton while loading", () => {
    renderCard({ status: "loading" });

    expect(screen.getByRole("status").textContent).toBe(
      "Ładowanie: ostatnich transakcji",
    );
  });

  it("shows an error with a retry button that retries once", () => {
    const onRetry = vi.fn();
    renderCard({ status: "error" }, onRetry);

    expect(screen.getByRole("alert").textContent).toBe(
      "Nie udało się wczytać transakcji.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows an empty state with a link and no header link when there are none", () => {
    renderCard({ status: "ready", page: makePage([]) });

    expect(
      screen.getByRole("heading", { level: 2, name: "Brak transakcji" }),
    ).toBeDefined();
    const link = screen.getByRole("link", { name: "Przejdź do transakcji" });
    expect(link.getAttribute("href")).toBe("/transactions");
    expect(screen.queryByRole("link", { name: /Wszystkie/ })).toBeNull();
  });

  it("shows one row per transaction in the order of the API", () => {
    renderCard(READY);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toContain("Zakupy w Biedronce");
    expect(items[1].textContent).toContain("Wynagrodzenie za listopad");
    expect(items[2].textContent).toContain("Bilety lotnicze");
  });

  it("shows the date, the category pill and the signed amount of a row", () => {
    renderCard(READY);

    expect(screen.getByText("17.11.2026")).toBeDefined();
    expect(screen.getByText("Artykuły spożywcze")).toBeDefined();
    expect(screen.getByText("-184,50 zł")).toBeDefined();
    // textContent keeps the non-breaking space that getByText collapses (as in DepositDialog.test).
    const salary = screen.getByText("Wynagrodzenie za listopad").closest("li");
    expect(salary?.textContent).toContain(`+7${NBSP}500,00 zł`);
    expect(screen.getByText("(100,00 EUR)")).toBeDefined();
  });

  it("links to the whole history with the total number of transactions", () => {
    renderCard(READY);

    const link = screen.getByRole("link", { name: "Wszystkie (42) →" });
    expect(link.getAttribute("href")).toBe("/transactions");
    expect(
      screen.getByRole("region", { name: "Ostatnie Transakcje" }),
    ).toBeDefined();
  });
});
