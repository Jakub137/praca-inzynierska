import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionsView } from "@/components/transactions/TransactionsView";
import type { CategoriesState } from "@/hooks/useCategories";
import type { CurrencyRatesState } from "@/hooks/useCurrencyRates";
import type { UseTransactionsResult } from "@/hooks/useTransactions";
import { ApiError } from "@/lib/api/errors";
import {
  DEFAULT_TRANSACTION_FILTERS,
  type TransactionFilters,
} from "@/lib/transactions/filters";
import { TEST_CATEGORIES } from "@/test-utils/categories";
import { TEST_RATES } from "@/test-utils/currencyRates";
import { installDialogStub } from "@/test-utils/dialog";
import {
  EXPENSE_PLN,
  makePage,
  TEST_MONTH_OPTIONS,
  TEST_TRANSACTIONS,
} from "@/test-utils/transactions";
import type {
  CreateTransactionRequest,
  TransactionResponse,
} from "@/types/api";

const useTransactionsMock = vi.hoisted(() =>
  vi.fn<(filters: TransactionFilters) => UseTransactionsResult>(),
);
const useCategoriesMock = vi.hoisted(() => vi.fn<() => CategoriesState>());
const useCurrencyRatesMock = vi.hoisted(() =>
  vi.fn<() => CurrencyRatesState>(),
);
const createTransactionMock = vi.hoisted(() =>
  vi.fn<
    (
      token: string,
      request: CreateTransactionRequest,
    ) => Promise<TransactionResponse>
  >(),
);
const showToastMock = vi.hoisted(() => vi.fn<(message: string) => void>());

vi.mock("@/hooks/useTransactions", () => ({
  useTransactions: useTransactionsMock,
}));
vi.mock("@/hooks/useCategories", () => ({
  useCategories: useCategoriesMock,
}));
vi.mock("@/hooks/useCurrencyRates", () => ({
  useCurrencyRates: useCurrencyRatesMock,
}));
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ showToast: showToastMock }),
}));
vi.mock("@/lib/api/transactions", () => ({
  createTransaction: createTransactionMock,
}));
vi.mock("@/lib/auth/session", () => ({
  readSessionToken: () => "token",
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const retryMock = vi.fn();

function renderWithState(
  state: UseTransactionsResult["state"],
  filters: TransactionFilters = DEFAULT_TRANSACTION_FILTERS,
) {
  useTransactionsMock.mockReturnValue({ state, retry: retryMock });
  return render(
    <TransactionsView filters={filters} monthOptions={TEST_MONTH_OPTIONS} />,
  );
}

function fillField(dialog: HTMLElement, label: string, value: string) {
  fireEvent.change(within(dialog).getByLabelText(label), {
    target: { value },
  });
}

// Opens the dialog and fills a valid expense; returns the opening button.
function openAndFillDialog(): HTMLElement {
  const opener = screen.getByRole("button", { name: "+ Dodaj wydatek" });
  fireEvent.click(opener);
  const dialog = screen.getByRole("dialog");
  fillField(dialog, "Kwota transakcji *", "184,50");
  fillField(dialog, "Opis transakcji *", "Zakupy w Biedronce");
  fillField(dialog, "Kategoria *", "1");
  return opener;
}

async function clickSave() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Zapisz wydatek" }));
  });
}

describe("TransactionsView", () => {
  beforeAll(installDialogStub);

  beforeEach(() => {
    retryMock.mockReset();
    useTransactionsMock.mockReset();
    createTransactionMock.mockReset();
    showToastMock.mockReset();
    useCategoriesMock.mockReturnValue({
      status: "ready",
      categories: TEST_CATEGORIES,
    });
    useCurrencyRatesMock.mockReturnValue({
      status: "ready",
      rates: TEST_RATES,
    });
  });

  it("renders nothing while idle", () => {
    const { container } = renderWithState({ status: "idle" });

    expect(container.firstChild).toBeNull();
  });

  it("passes the filters to the hook", () => {
    const filters: TransactionFilters = {
      page: 2,
      month: "2026-10",
      type: "EXPENSE",
      categoryId: 2,
    };

    renderWithState({ status: "loading" }, filters);

    expect(useTransactionsMock).toHaveBeenCalledWith(filters);
  });

  it("renders an accessible loading skeleton and keeps the filters visible", () => {
    renderWithState({ status: "loading" });

    expect(screen.getByRole("status").textContent).toBe("Ładowanie transakcji");
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByLabelText("Okres")).toBeTruthy();
  });

  it("renders the empty state with the add button as its only button", () => {
    renderWithState({ status: "ready", page: makePage([]) });

    expect(
      screen.getByRole("heading", { name: "Brak transakcji" }),
    ).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(
      screen.getAllByRole("button").map((button) => button.textContent),
    ).toEqual(["+ Dodaj wydatek"]);
  });

  it("renders the plain empty state for an empty account even on a later page", () => {
    renderWithState(
      { status: "ready", page: makePage([]) },
      { ...DEFAULT_TRANSACTION_FILTERS, page: 3 },
    );

    expect(
      screen.getByRole("heading", { name: "Brak transakcji" }),
    ).toBeTruthy();
  });

  it("offers to clear the filters when nothing matches them", () => {
    renderWithState(
      { status: "ready", page: makePage([]) },
      { ...DEFAULT_TRANSACTION_FILTERS, type: "INCOME" },
    );

    expect(
      screen.getByRole("heading", {
        name: "Brak transakcji dla wybranych filtrów",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Wyczyść filtry" }).getAttribute("href"),
    ).toBe("/transactions");
    expect(
      screen.queryByRole("heading", { name: "Brak transakcji" }),
    ).toBeNull();
  });

  it("links back to the first page when the page is out of range", () => {
    renderWithState(
      {
        status: "ready",
        page: makePage([], { page: 4, totalElements: 30, totalPages: 2 }),
      },
      { page: 5, month: null, type: "EXPENSE", categoryId: null },
    );

    expect(
      screen.getByRole("heading", { name: "Nie ma takiej strony wyników" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Przejdź do pierwszej strony" })
        .getAttribute("href"),
    ).toBe("/transactions?type=EXPENSE");
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

  it("renders the table with one row per transaction and the range summary", () => {
    renderWithState({ status: "ready", page: makePage(TEST_TRANSACTIONS) });

    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getAllByRole("row")).toHaveLength(
      TEST_TRANSACTIONS.length + 1,
    );
    expect(screen.getByText("Pokazano 1–3 z 3 transakcji")).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Brak transakcji" }),
    ).toBeNull();
  });

  it("shows the add button above the filters in every state", () => {
    const { unmount } = renderWithState({ status: "loading" });

    expect(
      screen.getByRole("button", { name: "+ Dodaj wydatek" }),
    ).toBeTruthy();

    unmount();
    renderWithState({ status: "error" });

    expect(
      screen.getByRole("button", { name: "+ Dodaj wydatek" }),
    ).toBeTruthy();
  });

  it("posts the transaction, closes the dialog, reloads the list and then shows the toast", async () => {
    createTransactionMock.mockResolvedValue(EXPENSE_PLN);
    renderWithState({ status: "ready", page: makePage(TEST_TRANSACTIONS) });
    const opener = openAndFillDialog();

    await clickSave();

    expect(createTransactionMock).toHaveBeenCalledWith("token", {
      amount: 184.5,
      currency: "PLN",
      categoryId: 1,
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      description: "Zakupy w Biedronce",
      type: "EXPENSE",
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(retryMock).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledWith(
      "Transakcja została zapisana pomyślnie",
    );
    const [retryOrder = 0] = retryMock.mock.invocationCallOrder;
    const [toastOrder = 0] = showToastMock.mock.invocationCallOrder;
    expect(retryOrder).toBeGreaterThan(0);
    expect(retryOrder).toBeLessThan(toastOrder);
    expect(document.activeElement).toBe(opener);
  });

  it("keeps the dialog open and shows the detail when saving fails", async () => {
    createTransactionMock.mockRejectedValue(
      new ApiError(400, {
        status: 400,
        detail: "Typ kategorii nie zgadza się z typem transakcji.",
      }),
    );
    renderWithState({ status: "ready", page: makePage(TEST_TRANSACTIONS) });
    openAndFillDialog();

    await clickSave();

    expect(screen.getByRole("alert").textContent).toContain(
      "Typ kategorii nie zgadza się z typem transakcji.",
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(retryMock).not.toHaveBeenCalled();
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it("sends nothing while the form is invalid", async () => {
    renderWithState({ status: "ready", page: makePage(TEST_TRANSACTIONS) });
    fireEvent.click(screen.getByRole("button", { name: "+ Dodaj wydatek" }));

    await clickSave();

    expect(createTransactionMock).not.toHaveBeenCalled();
    expect(retryMock).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
