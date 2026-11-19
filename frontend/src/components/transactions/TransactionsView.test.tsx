import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionsView } from "@/components/transactions/TransactionsView";
import type { UseTransactionsResult } from "@/hooks/useTransactions";
import { makePage, TEST_TRANSACTIONS } from "@/test-utils/transactions";

const useTransactionsMock = vi.hoisted(() =>
  vi.fn<() => UseTransactionsResult>(),
);

vi.mock("@/hooks/useTransactions", () => ({
  useTransactions: useTransactionsMock,
}));

const retryMock = vi.fn();

function renderWithState(state: UseTransactionsResult["state"]) {
  useTransactionsMock.mockReturnValue({ state, retry: retryMock });
  return render(<TransactionsView />);
}

describe("TransactionsView", () => {
  beforeEach(() => {
    retryMock.mockReset();
  });

  it("renders nothing while idle", () => {
    const { container } = renderWithState({ status: "idle" });

    expect(container.firstChild).toBeNull();
  });

  it("renders an accessible loading skeleton instead of the table", () => {
    renderWithState({ status: "loading" });

    expect(screen.getByRole("status").textContent).toBe("Ładowanie transakcji");
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("renders the empty state without a button when there are no transactions", () => {
    renderWithState({ status: "ready", page: makePage([]) });

    expect(
      screen.getByRole("heading", { name: "Brak transakcji" }),
    ).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders an error alert and retries on click", () => {
    renderWithState({ status: "error" });

    expect(screen.getByRole("alert").textContent).toContain(
      "Nie udało się wczytać transakcji.",
    );
    expect(screen.queryByRole("table")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));

    expect(retryMock).toHaveBeenCalledTimes(1);
  });

  it("renders the table with one row per transaction", () => {
    renderWithState({ status: "ready", page: makePage(TEST_TRANSACTIONS) });

    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getAllByRole("row")).toHaveLength(
      TEST_TRANSACTIONS.length + 1,
    );
    expect(
      screen.queryByRole("heading", { name: "Brak transakcji" }),
    ).toBeNull();
  });
});
