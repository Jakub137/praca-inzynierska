import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { RecurringPaymentsView } from "@/components/recurring/RecurringPaymentsView";
import type { CategoriesState } from "@/hooks/useCategories";
import type {
  RecurringPaymentsState,
  UseRecurringPaymentsResult,
} from "@/hooks/useRecurringPayments";
import { ApiError } from "@/lib/api/errors";
import { TEST_CATEGORIES } from "@/test-utils/categories";
import { installDialogStub } from "@/test-utils/dialog";
import {
  NETFLIX_PAYMENT,
  RECURRING_TEST_TODAY,
  TEST_PAYMENTS,
} from "@/test-utils/recurringPayments";
import type {
  RecurringPaymentRequest,
  RecurringPaymentResponse,
} from "@/types/api";

const useRecurringPaymentsMock = vi.hoisted(() =>
  vi.fn<() => UseRecurringPaymentsResult>(),
);
const createRecurringPaymentMock = vi.hoisted(() =>
  vi.fn<
    (
      token: string,
      request: RecurringPaymentRequest,
    ) => Promise<RecurringPaymentResponse>
  >(),
);
const readSessionTokenMock = vi.hoisted(() =>
  vi.fn<() => string | undefined>(),
);
const useCategoriesMock = vi.hoisted(() => vi.fn<() => CategoriesState>());
const showToastMock = vi.hoisted(() => vi.fn<(message: string) => void>());

vi.mock("@/hooks/useRecurringPayments", () => ({
  useRecurringPayments: useRecurringPaymentsMock,
}));
vi.mock("@/lib/api/recurringPayments", () => ({
  createRecurringPayment: createRecurringPaymentMock,
}));
vi.mock("@/lib/auth/session", () => ({
  readSessionToken: readSessionTokenMock,
}));
vi.mock("@/hooks/useCategories", () => ({
  useCategories: useCategoriesMock,
}));
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

function renderView(
  state: RecurringPaymentsState,
  retry: () => void = vi.fn(),
) {
  useRecurringPaymentsMock.mockReturnValue({ state, retry });
  return render(<RecurringPaymentsView />);
}

function showState(
  rerender: (ui: ReactElement) => void,
  state: RecurringPaymentsState,
  retry: () => void,
) {
  useRecurringPaymentsMock.mockReturnValue({ state, retry });
  rerender(<RecurringPaymentsView />);
}

const READY: RecurringPaymentsState = {
  status: "ready",
  payments: TEST_PAYMENTS,
  today: RECURRING_TEST_TODAY,
};
const EMPTY: RecurringPaymentsState = {
  status: "ready",
  payments: [],
  today: RECURRING_TEST_TODAY,
};

describe("RecurringPaymentsView", () => {
  beforeEach(() => {
    useRecurringPaymentsMock.mockReset();
  });

  it("renders nothing while the user is not authenticated", () => {
    const { container } = renderView({ status: "idle" });

    expect(container.innerHTML).toBe("");
  });

  it("shows the loading skeleton", () => {
    renderView({ status: "loading" });

    expect(screen.getByRole("status").textContent).toBe(
      "Ładowanie płatności cyklicznych",
    );
  });

  it("shows an error with a retry button", () => {
    const retry = vi.fn();
    renderView({ status: "error" }, retry);

    expect(screen.getByRole("alert").textContent).toBe(
      "Nie udało się wczytać płatności cyklicznych.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("shows a text message instead of an empty table", () => {
    renderView(EMPTY);

    expect(
      screen.getByRole("heading", { name: "Brak płatności cyklicznych" }),
    ).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("renders the table with one row per payment", () => {
    renderView(READY);

    expect(
      screen.getByRole("region", { name: "Lista płatności cyklicznych" }),
    ).toBeTruthy();
    expect(screen.getAllByRole("row")).toHaveLength(TEST_PAYMENTS.length + 1);
  });

  it("gives the table the date read by the hook", () => {
    renderView(READY);

    expect(screen.getByText("po terminie (3 dni)")).toBeTruthy();
    expect(screen.getByText("za 3 dni")).toBeTruthy();
  });
});

describe("RecurringPaymentsView dialog", () => {
  const NAME = "Nazwa płatności *";
  const AMOUNT = "Kwota *";
  const CATEGORY = "Kategoria *";
  const DATE = "Data najbliższej płatności *";
  const PAST =
    "Termin następnej płatności nie może być w przeszłości. Wybierz dzisiejszą lub późniejszą datę.";
  const NOT_EXPENSE =
    "Płatność cykliczną można przypisać tylko do kategorii wydatków. Wybierz kategorię wydatków.";

  beforeAll(installDialogStub);

  beforeEach(() => {
    useRecurringPaymentsMock.mockReset();
    createRecurringPaymentMock.mockReset();
    readSessionTokenMock.mockReset();
    useCategoriesMock.mockReset();
    showToastMock.mockReset();
    readSessionTokenMock.mockReturnValue("token");
    useCategoriesMock.mockReturnValue({
      status: "ready",
      categories: TEST_CATEGORIES,
    });
    // Only Date is faked: the view reads "today" when the dialog opens (2026-11-21 in Warsaw).
    vi.useFakeTimers({
      toFake: ["Date"],
      now: new Date("2026-11-21T10:00:00Z"),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function openDialog() {
    fireEvent.click(
      screen.getAllByRole("button", { name: "+ Dodaj płatność" })[0],
    );
  }

  function fill(label: string, value: string) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }

  async function fillAndSave() {
    fill(NAME, "Netflix");
    fill(AMOUNT, "43");
    fill(CATEGORY, "2");
    fill(DATE, "2026-12-01");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Zapisz płatność" }));
    });
  }

  it.each<RecurringPaymentsState>([
    { status: "loading" },
    { status: "error" },
    READY,
    EMPTY,
  ])("shows the add button in every state except idle (case %#)", (state) => {
    renderView(state);

    expect(
      screen.getAllByRole("button", { name: "+ Dodaj płatność" })[0],
    ).toBeTruthy();
  });

  it("shows the add button in the empty state as well as in the header", () => {
    renderView(EMPTY);

    expect(
      screen.getAllByRole("button", { name: "+ Dodaj płatność" }),
    ).toHaveLength(2);
  });

  it("opens the dialog with dates from today", () => {
    renderView(READY);

    openDialog();

    expect(
      screen.getByRole("dialog", { name: "Dodaj płatność cykliczną" }),
    ).toBeTruthy();
    expect(screen.getByLabelText(DATE).getAttribute("min")).toBe("2026-11-21");
  });

  it("saves a payment, reloads, shows the toast and keeps the focus on the add button", async () => {
    createRecurringPaymentMock.mockResolvedValue(NETFLIX_PAYMENT);
    const retry = vi.fn();
    renderView(READY, retry);

    openDialog();
    await fillAndSave();

    expect(createRecurringPaymentMock).toHaveBeenCalledWith("token", {
      name: "Netflix",
      amount: 43,
      currency: "PLN",
      frequency: "MONTHLY",
      nextDueDate: "2026-12-01",
      categoryId: 2,
    });
    expect(retry).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledWith("Dodano płatność cykliczną");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getAllByRole("button", { name: "+ Dodaj płatność" })[0],
    );
  });

  it("returns the focus to the header add button after a payment saved from the empty state", async () => {
    createRecurringPaymentMock.mockResolvedValue(NETFLIX_PAYMENT);
    const retry = vi.fn();
    const { rerender } = renderView(EMPTY, retry);

    // The second button is the one of the empty state; it disappears when the list reloads.
    fireEvent.click(
      screen.getAllByRole("button", { name: "+ Dodaj płatność" })[1],
    );
    await fillAndSave();

    showState(rerender, { status: "loading" }, retry);
    showState(rerender, READY, retry);

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "+ Dodaj płatność" }),
    );
  });

  it("keeps the dialog, the typed values and the data when saving fails", async () => {
    createRecurringPaymentMock.mockRejectedValue(
      new ApiError(500, { status: 500, detail: "Błąd serwera." }),
    );
    const retry = vi.fn();
    renderView(READY, retry);

    openDialog();
    await fillAndSave();

    expect(screen.getByRole("alert").textContent).toBe("Błąd serwera.");
    expect(
      screen.getByRole("dialog", { name: "Dodaj płatność cykliczną" }),
    ).toBeTruthy();
    expect((screen.getByLabelText(NAME) as HTMLInputElement).value).toBe(
      "Netflix",
    );
    expect(retry).not.toHaveBeenCalled();
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it("shows the date message of the server under the date field", async () => {
    createRecurringPaymentMock.mockRejectedValue(
      new ApiError(400, {
        status: 400,
        fieldErrors: [{ field: "nextDueDate", message: PAST }],
      }),
    );
    renderView(READY);

    openDialog();
    await fillAndSave();

    expect(screen.getByRole("alert").textContent).toBe(PAST);
    expect(document.activeElement).toBe(screen.getByLabelText(DATE));
  });

  it("shows the 400 for an income category in the dialog and keeps it open", async () => {
    createRecurringPaymentMock.mockRejectedValue(
      new ApiError(400, {
        status: 400,
        title: "Nieprawidłowa kategoria",
        detail: NOT_EXPENSE,
      }),
    );
    const retry = vi.fn();
    renderView(READY, retry);

    openDialog();
    await fillAndSave();

    expect(screen.getByRole("alert").textContent).toBe(NOT_EXPENSE);
    expect(
      screen.getByRole("dialog", { name: "Dodaj płatność cykliczną" }),
    ).toBeTruthy();
    expect(retry).not.toHaveBeenCalled();
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it("shows the 404 for someone else's category in the dialog and keeps it open", async () => {
    // The text is arbitrary here: the view shows the detail it gets from the server.
    createRecurringPaymentMock.mockRejectedValue(
      new ApiError(404, { status: 404, detail: "Nie znaleziono kategorii." }),
    );
    const retry = vi.fn();
    renderView(READY, retry);

    openDialog();
    await fillAndSave();

    expect(screen.getByRole("alert").textContent).toBe(
      "Nie znaleziono kategorii.",
    );
    expect(
      screen.getByRole("dialog", { name: "Dodaj płatność cykliczną" }),
    ).toBeTruthy();
    expect(retry).not.toHaveBeenCalled();
  });

  it("returns the focus to the add button on Anuluj", () => {
    renderView(READY);

    openDialog();
    fireEvent.click(screen.getByRole("button", { name: "Anuluj" }));

    expect(createRecurringPaymentMock).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      screen.getAllByRole("button", { name: "+ Dodaj płatność" })[0],
    );
  });
});
