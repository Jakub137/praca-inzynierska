import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TransactionsPage, { metadata } from "@/app/(app)/transactions/page";
import type { UseTransactionsResult } from "@/hooks/useTransactions";

const useTransactionsMock = vi.hoisted(() =>
  vi.fn<() => UseTransactionsResult>(),
);

vi.mock("@/hooks/useTransactions", () => ({
  useTransactions: useTransactionsMock,
}));

describe("TransactionsPage", () => {
  beforeEach(() => {
    useTransactionsMock.mockReturnValue({
      state: { status: "loading" },
      retry: vi.fn(),
    });
  });

  it("renders the page heading", () => {
    render(<TransactionsPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Transakcje" }),
    ).toBeTruthy();
  });

  it("renders the transactions view", () => {
    render(<TransactionsPage />);

    expect(screen.getByRole("status").textContent).toBe("Ładowanie transakcji");
  });

  it("sets the page title for the %s | Saldo template", () => {
    expect(metadata.title).toBe("Transakcje");
  });
});
