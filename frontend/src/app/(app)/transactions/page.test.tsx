import { fireEvent, render, screen } from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import TransactionsPage, { metadata } from "@/app/(app)/transactions/page";
import type { CategoriesState } from "@/hooks/useCategories";
import type { UseTransactionsResult } from "@/hooks/useTransactions";
import type { TransactionFilters } from "@/lib/transactions/filters";
import { TEST_CATEGORIES } from "@/test-utils/categories";
import { installDialogStub } from "@/test-utils/dialog";

const useTransactionsMock = vi.hoisted(() =>
  vi.fn<(filters: TransactionFilters) => UseTransactionsResult>(),
);
const useCategoriesMock = vi.hoisted(() => vi.fn<() => CategoriesState>());

vi.mock("@/hooks/useTransactions", () => ({
  useTransactions: useTransactionsMock,
}));
vi.mock("@/hooks/useCategories", () => ({
  useCategories: useCategoriesMock,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

async function renderPage(
  searchParams: Record<string, string | string[] | undefined> = {},
) {
  render(
    await TransactionsPage({ searchParams: Promise.resolve(searchParams) }),
  );
}

describe("TransactionsPage", () => {
  beforeAll(installDialogStub);

  beforeEach(() => {
    useTransactionsMock.mockReset();
    useTransactionsMock.mockReturnValue({
      state: { status: "loading" },
      retry: vi.fn(),
    });
    useCategoriesMock.mockReturnValue({
      status: "ready",
      categories: TEST_CATEGORIES,
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
      screen.getByRole("heading", { level: 1, name: "Transakcje" }),
    ).toBeTruthy();
  });

  it("renders the transactions view", async () => {
    await renderPage();

    expect(screen.getByRole("status").textContent).toBe("Ładowanie transakcji");
  });

  it("sets the page title for the %s | Saldo template", () => {
    expect(metadata.title).toBe("Transakcje");
  });

  it("uses the defaults for an address without parameters", async () => {
    await renderPage();

    expect(useTransactionsMock).toHaveBeenCalledWith({
      page: 1,
      month: null,
      type: null,
      categoryId: null,
    });
  });

  it("reads valid parameters from the address", async () => {
    await renderPage({
      page: "2",
      month: "2026-10",
      type: "EXPENSE",
      categoryId: "7",
    });

    expect(useTransactionsMock).toHaveBeenCalledWith({
      page: 2,
      month: "2026-10",
      type: "EXPENSE",
      categoryId: 7,
    });
  });

  it("replaces invalid parameters with the defaults", async () => {
    await renderPage({
      page: "abc",
      month: "2026-13",
      type: "FOO",
      categoryId: "x",
    });

    expect(useTransactionsMock).toHaveBeenCalledWith({
      page: 1,
      month: null,
      type: null,
      categoryId: null,
    });
  });

  it("rejects a month older than the 12 offered", async () => {
    await renderPage({ month: "2025-10" });

    expect(useTransactionsMock).toHaveBeenCalledWith(
      expect.objectContaining({ month: null }),
    );
  });

  it("opens the new transaction dialog from the add button and returns the focus on close", async () => {
    await renderPage();
    const addButton = screen.getByRole("button", { name: "+ Dodaj wydatek" });

    fireEvent.click(addButton);

    expect(
      screen.getByRole("dialog", { name: "Dodaj nową transakcję" }),
    ).toBeTruthy();
    expect(
      (screen.getByLabelText("Data transakcji *") as HTMLInputElement).value,
    ).toBe("2026-11-19");

    fireEvent.click(screen.getByRole("button", { name: "Anuluj" }));

    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
    expect(document.activeElement).toBe(addButton);
  });
});
