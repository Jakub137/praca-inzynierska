import {
  act,
  fireEvent,
  render,
  type RenderResult,
  screen,
  within,
} from "@testing-library/react";
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
  INCOME_PLN,
  makePage,
  TEST_MONTH_OPTIONS,
  TEST_TRANSACTIONS,
} from "@/test-utils/transactions";
import type {
  CreateTransactionRequest,
  TransactionResponse,
  UpdateTransactionRequest,
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
const updateTransactionMock = vi.hoisted(() =>
  vi.fn<
    (
      token: string,
      id: string,
      request: UpdateTransactionRequest,
    ) => Promise<TransactionResponse>
  >(),
);
const showToastMock = vi.hoisted(() => vi.fn<(message: string) => void>());
const deleteTransactionMock = vi.hoisted(() =>
  vi.fn<(token: string, id: string) => Promise<void>>(),
);
const replaceMock = vi.hoisted(() =>
  vi.fn<(href: string, options?: { scroll: boolean }) => void>(),
);

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
  updateTransaction: updateTransactionMock,
  deleteTransaction: deleteTransactionMock,
}));
vi.mock("@/lib/auth/session", () => ({
  readSessionToken: () => "token",
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
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
    updateTransactionMock.mockReset();
    showToastMock.mockReset();
    deleteTransactionMock.mockReset();
    replaceMock.mockReset();
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

  describe("deleting a transaction", () => {
    const DELETE_BUTTON_NAME =
      "Usuń transakcję: Zakupy w Biedronce, 17.11.2026";

    function renderList(
      filters: TransactionFilters = DEFAULT_TRANSACTION_FILTERS,
      page = makePage(TEST_TRANSACTIONS),
    ) {
      renderWithState({ status: "ready", page }, filters);
    }

    function openDeleteDialog(): HTMLElement {
      const trash = screen.getByRole("button", { name: DELETE_BUTTON_NAME });
      fireEvent.click(trash);
      return trash;
    }

    async function confirmDelete() {
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Usuń" }));
      });
    }

    it("opens the confirmation from the trash button without sending anything", () => {
      renderList();

      openDeleteDialog();

      const dialog = screen.getByRole("dialog", { name: "Usuń transakcję" });
      expect(
        within(dialog).getByText("Czy na pewno chcesz usunąć tę transakcję?"),
      ).toBeTruthy();
      expect(
        within(dialog).getByText("Zakupy w Biedronce, 17.11.2026"),
      ).toBeTruthy();
      expect(deleteTransactionMock).not.toHaveBeenCalled();
    });

    it("deletes, closes the dialog, reloads the list, shows the toast and focuses the add button", async () => {
      deleteTransactionMock.mockResolvedValue(undefined);
      renderList();
      openDeleteDialog();

      await confirmDelete();

      expect(deleteTransactionMock).toHaveBeenCalledWith(
        "token",
        EXPENSE_PLN.id,
      );
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(retryMock).toHaveBeenCalledTimes(1);
      expect(replaceMock).not.toHaveBeenCalled();
      expect(showToastMock).toHaveBeenCalledWith("Transakcja została usunięta");
      const [retryOrder = 0] = retryMock.mock.invocationCallOrder;
      const [toastOrder = 0] = showToastMock.mock.invocationCallOrder;
      expect(retryOrder).toBeGreaterThan(0);
      expect(retryOrder).toBeLessThan(toastOrder);
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "+ Dodaj wydatek" }),
      );
    });

    it("sends nothing and returns the focus to the trash button on Anuluj", () => {
      renderList();
      const trash = openDeleteDialog();

      fireEvent.click(screen.getByRole("button", { name: "Anuluj" }));

      expect(deleteTransactionMock).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(retryMock).not.toHaveBeenCalled();
      expect(showToastMock).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(trash);
    });

    it("keeps the dialog open and shows the detail when deleting fails", async () => {
      deleteTransactionMock.mockRejectedValue(
        new ApiError(404, { status: 404, detail: "Nie znaleziono zasobu." }),
      );
      renderList();
      openDeleteDialog();

      await confirmDelete();

      expect(screen.getByRole("alert").textContent).toContain(
        "Nie znaleziono zasobu.",
      );
      expect(screen.getByRole("dialog")).toBeTruthy();
      expect(retryMock).not.toHaveBeenCalled();
      expect(replaceMock).not.toHaveBeenCalled();
      expect(showToastMock).not.toHaveBeenCalled();
    });

    it("goes back one page and keeps the filters when the only row of a later page was deleted", async () => {
      deleteTransactionMock.mockResolvedValue(undefined);
      renderList(
        { page: 3, month: null, type: "EXPENSE", categoryId: null },
        makePage([EXPENSE_PLN], { page: 2, totalElements: 31, totalPages: 3 }),
      );
      openDeleteDialog();

      await confirmDelete();

      expect(replaceMock).toHaveBeenCalledTimes(1);
      expect(replaceMock).toHaveBeenCalledWith(
        "/transactions?type=EXPENSE&page=2",
        { scroll: false },
      );
      expect(retryMock).not.toHaveBeenCalled();
      expect(showToastMock).toHaveBeenCalledWith("Transakcja została usunięta");
    });

    it("only reloads when a later page still has other rows", async () => {
      deleteTransactionMock.mockResolvedValue(undefined);
      renderList(
        { ...DEFAULT_TRANSACTION_FILTERS, page: 2 },
        makePage(TEST_TRANSACTIONS, {
          page: 1,
          totalElements: 18,
          totalPages: 2,
        }),
      );
      openDeleteDialog();

      await confirmDelete();

      expect(retryMock).toHaveBeenCalledTimes(1);
      expect(replaceMock).not.toHaveBeenCalled();
    });

    it("only reloads when the only row of the first page was deleted", async () => {
      deleteTransactionMock.mockResolvedValue(undefined);
      renderList(DEFAULT_TRANSACTION_FILTERS, makePage([EXPENSE_PLN]));
      openDeleteDialog();

      await confirmDelete();

      expect(retryMock).toHaveBeenCalledTimes(1);
      expect(replaceMock).not.toHaveBeenCalled();
    });
  });

  describe("editing a transaction", () => {
    const EDIT_BUTTON_NAME =
      "Edytuj transakcję: Zakupy w Biedronce, 17.11.2026";
    const UPDATED: TransactionResponse = {
      ...EXPENSE_PLN,
      amount: 200,
      amountPln: 200,
    };

    function renderList(transactions = TEST_TRANSACTIONS) {
      return renderWithState({
        status: "ready",
        page: makePage(transactions),
      });
    }

    // Shows a new state of the list, as the hook does after retry().
    function showState(
      rerender: RenderResult["rerender"],
      state: UseTransactionsResult["state"],
    ) {
      useTransactionsMock.mockReturnValue({ state, retry: retryMock });
      rerender(
        <TransactionsView
          filters={DEFAULT_TRANSACTION_FILTERS}
          monthOptions={TEST_MONTH_OPTIONS}
        />,
      );
    }

    function openEditDialog(name = EDIT_BUTTON_NAME): HTMLElement {
      const pencil = screen.getByRole("button", { name });
      fireEvent.click(pencil);
      return pencil;
    }

    function valueOf(dialog: HTMLElement, label: string): string {
      return (within(dialog).getByLabelText(label) as HTMLInputElement).value;
    }

    async function clickSaveChanges() {
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Zapisz zmiany" }));
      });
    }

    it("opens the dialog in edit mode filled from the row without sending anything", () => {
      renderList();

      openEditDialog();

      const dialog = screen.getByRole("dialog", { name: "Edytuj transakcję" });
      expect(valueOf(dialog, "Kwota transakcji *")).toBe("184,50");
      expect(valueOf(dialog, "Waluta")).toBe("PLN");
      expect(valueOf(dialog, "Opis transakcji *")).toBe("Zakupy w Biedronce");
      expect(valueOf(dialog, "Kategoria *")).toBe("1");
      expect(valueOf(dialog, "Data transakcji *")).toBe("2026-11-17");
      expect(updateTransactionMock).not.toHaveBeenCalled();
      expect(createTransactionMock).not.toHaveBeenCalled();
    });

    it("puts the changed transaction, closes the dialog, reloads the list and then shows the toast", async () => {
      updateTransactionMock.mockResolvedValue(UPDATED);
      renderList();
      openEditDialog();
      fillField(screen.getByRole("dialog"), "Kwota transakcji *", "200,00");

      await clickSaveChanges();

      expect(updateTransactionMock).toHaveBeenCalledWith(
        "token",
        EXPENSE_PLN.id,
        {
          amount: 200,
          currency: "PLN",
          categoryId: 1,
          date: "2026-11-17",
          description: "Zakupy w Biedronce",
          type: "EXPENSE",
        },
      );
      expect(createTransactionMock).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(retryMock).toHaveBeenCalledTimes(1);
      expect(showToastMock).toHaveBeenCalledWith(
        "Transakcja została zaktualizowana",
      );
      const [retryOrder = 0] = retryMock.mock.invocationCallOrder;
      const [toastOrder = 0] = showToastMock.mock.invocationCallOrder;
      expect(retryOrder).toBeGreaterThan(0);
      expect(retryOrder).toBeLessThan(toastOrder);
    });

    it("returns the focus to the pencil of the same row once the list is back", async () => {
      updateTransactionMock.mockResolvedValue(UPDATED);
      const { rerender } = renderList();
      openEditDialog();
      await clickSaveChanges();

      showState(rerender, { status: "loading" });
      showState(rerender, { status: "ready", page: makePage([UPDATED]) });

      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: EDIT_BUTTON_NAME }),
      );
    });

    it("focuses the add button when the edited row is not on the reloaded page", async () => {
      updateTransactionMock.mockResolvedValue(UPDATED);
      const { rerender } = renderList();
      openEditDialog();
      await clickSaveChanges();

      showState(rerender, { status: "loading" });
      showState(rerender, { status: "ready", page: makePage([INCOME_PLN]) });

      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "+ Dodaj wydatek" }),
      );
    });

    it("focuses the add button when the reload fails and does not steal the focus later", async () => {
      updateTransactionMock.mockResolvedValue(UPDATED);
      const { rerender } = renderList();
      openEditDialog();
      await clickSaveChanges();

      showState(rerender, { status: "loading" });
      showState(rerender, { status: "error" });

      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "+ Dodaj wydatek" }),
      );

      screen.getByRole("button", { name: "Spróbuj ponownie" }).focus();
      showState(rerender, { status: "ready", page: makePage([UPDATED]) });

      expect(document.activeElement).not.toBe(
        screen.getByRole("button", { name: EDIT_BUTTON_NAME }),
      );
    });

    it("sends nothing and returns the focus to the pencil on Anuluj", () => {
      renderList();
      const pencil = openEditDialog();

      fireEvent.click(screen.getByRole("button", { name: "Anuluj" }));

      expect(updateTransactionMock).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(retryMock).not.toHaveBeenCalled();
      expect(showToastMock).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(pencil);
    });

    it.each([
      [404, "Nie znaleziono zasobu."],
      [503, "Nie udało się pobrać kursu waluty."],
    ] as const)(
      "keeps the dialog open with the data and shows the detail of a %i answer",
      async (status, detail) => {
        updateTransactionMock.mockRejectedValue(
          new ApiError(status, { status, detail }),
        );
        renderList();
        openEditDialog();

        await clickSaveChanges();

        const dialog = screen.getByRole("dialog", {
          name: "Edytuj transakcję",
        });
        expect(within(dialog).getByRole("alert").textContent).toContain(detail);
        expect(valueOf(dialog, "Kwota transakcji *")).toBe("184,50");
        expect(retryMock).not.toHaveBeenCalled();
        expect(showToastMock).not.toHaveBeenCalled();
      },
    );

    it("asks for a description before saving a transaction that has none", async () => {
      renderList([{ ...EXPENSE_PLN, description: null }]);
      openEditDialog("Edytuj transakcję: Bez opisu, 17.11.2026");

      const dialog = screen.getByRole("dialog", { name: "Edytuj transakcję" });
      expect(valueOf(dialog, "Opis transakcji *")).toBe("");

      await clickSaveChanges();

      expect(screen.getByText("Podaj opis transakcji.")).toBeTruthy();
      expect(updateTransactionMock).not.toHaveBeenCalled();
    });

    it("tells that the saved rate stays for an unchanged foreign currency", () => {
      renderList();

      openEditDialog("Edytuj transakcję: Bilety lotnicze, 12.11.2026");

      expect(
        screen.getByText(
          "≈ 431,00 PLN po kursie z dnia transakcji (4,3100); kurs się nie zmieni.",
        ),
      ).toBeTruthy();
    });
  });
});
