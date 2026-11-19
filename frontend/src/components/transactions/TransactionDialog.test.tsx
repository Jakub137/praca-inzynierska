import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TransactionDialog,
  type TransactionDialogProps,
} from "@/components/transactions/TransactionDialog";
import type { CategoriesState } from "@/hooks/useCategories";
import type { CurrencyRatesState } from "@/hooks/useCurrencyRates";
import {
  ApiError,
  NETWORK_ERROR_MESSAGE,
  NetworkError,
} from "@/lib/api/errors";
import {
  createEmptyFormValues,
  type TransactionFormValues,
} from "@/lib/transactions/transactionForm";
import { TEST_CATEGORIES } from "@/test-utils/categories";
import { TEST_RATES } from "@/test-utils/currencyRates";
import { installDialogStub } from "@/test-utils/dialog";

const useCategoriesMock = vi.hoisted(() => vi.fn<() => CategoriesState>());
const useCurrencyRatesMock = vi.hoisted(() =>
  vi.fn<() => CurrencyRatesState>(),
);

vi.mock("@/hooks/useCategories", () => ({
  useCategories: useCategoriesMock,
}));

vi.mock("@/hooks/useCurrencyRates", () => ({
  useCurrencyRates: useCurrencyRatesMock,
}));

const AMOUNT = "Kwota transakcji *";
const DESCRIPTION = "Opis transakcji *";
const CATEGORY = "Kategoria *";
const DATE = "Data transakcji *";
const SERVER_NOTE = "Kwotę w PLN wyliczy serwer po kursie z dnia transakcji.";
const INITIAL_VALUES = createEmptyFormValues("2026-11-19");

function renderDialog(overrides: Partial<TransactionDialogProps> = {}) {
  const onClose = vi.fn();
  const onSubmit = vi.fn(() => Promise.resolve());
  render(
    <TransactionDialog
      mode="create"
      initialValues={INITIAL_VALUES}
      onClose={onClose}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );
  return { onClose, onSubmit };
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillValidForm() {
  fill(AMOUNT, "184,50");
  fill(DESCRIPTION, "Zakupy w Biedronce");
  fill(CATEGORY, "1");
}

function clickSave(name = "Zapisz wydatek") {
  fireEvent.click(screen.getByRole("button", { name }));
}

// Clicks save and lets the pending request settle inside act().
async function saveAndSettle(name = "Zapisz wydatek") {
  await act(async () => {
    clickSave(name);
  });
}

function valueOf(label: string): string {
  return (screen.getByLabelText(label) as HTMLInputElement).value;
}

describe("TransactionDialog", () => {
  beforeAll(installDialogStub);

  beforeEach(() => {
    useCategoriesMock.mockReturnValue({
      status: "ready",
      categories: TEST_CATEGORIES,
    });
    useCurrencyRatesMock.mockReturnValue({
      status: "ready",
      rates: TEST_RATES,
    });
  });

  it("renders the title, the subtitle and the form fields", () => {
    renderDialog();

    expect(
      screen.getByRole("dialog", { name: "Dodaj nową transakcję" }),
    ).toBeTruthy();
    expect(
      screen.getByText("Wprowadź dane wydatku lub przychodu do budżetu"),
    ).toBeTruthy();
    for (const label of [AMOUNT, "Waluta", DESCRIPTION, CATEGORY, DATE]) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
  });

  it("has no payment method field and no recurring checkbox", () => {
    renderDialog();

    expect(screen.queryByLabelText(/Metoda płatności/)).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("offers every supported currency", () => {
    renderDialog();

    const options = Array.from(
      (screen.getByLabelText("Waluta") as HTMLSelectElement).options,
    );

    expect(options.map((option) => option.value)).toEqual([
      "PLN",
      "EUR",
      "USD",
      "GBP",
      "CHF",
    ]);
    expect(options[0]?.textContent).toBe("PLN (zł)");
  });

  it("starts with the given date, PLN and the expense button", () => {
    renderDialog();

    expect(valueOf(DATE)).toBe("2026-11-19");
    expect(valueOf("Waluta")).toBe("PLN");
    expect(screen.getByRole("button", { name: "Zapisz wydatek" })).toBeTruthy();
  });

  it("focuses the amount field when opened", () => {
    renderDialog();

    expect(document.activeElement).toBe(screen.getByLabelText(AMOUNT));
  });

  it("limits the amount and the description with maxLength", () => {
    renderDialog();

    expect(screen.getByLabelText(AMOUNT).getAttribute("maxlength")).toBe("13");
    expect(screen.getByLabelText(DESCRIPTION).getAttribute("maxlength")).toBe(
      "100",
    );
  });

  it("fills the fields from the initial values and uses the edit texts", () => {
    const initialValues: TransactionFormValues = {
      amount: "100,00",
      currency: "EUR",
      description: "Bilet",
      categoryId: "2",
      date: "2026-11-17",
    };

    renderDialog({ mode: "edit", initialValues });

    expect(valueOf(AMOUNT)).toBe("100,00");
    expect(valueOf("Waluta")).toBe("EUR");
    expect(valueOf(DESCRIPTION)).toBe("Bilet");
    expect(valueOf(CATEGORY)).toBe("2");
    expect(valueOf(DATE)).toBe("2026-11-17");
    expect(
      screen.getByRole("dialog", { name: "Edytuj transakcję" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Zapisz zmiany" })).toBeTruthy();
  });

  it("lists the categories in groups of expenses and incomes", () => {
    renderDialog();

    const groups = Array.from(
      screen.getByLabelText(CATEGORY).querySelectorAll("optgroup"),
    );

    expect(groups.map((group) => group.label)).toEqual([
      "Wydatki",
      "Przychody",
    ]);
    expect(
      Array.from(groups[1]?.querySelectorAll("option") ?? []).map(
        (option) => option.textContent,
      ),
    ).toEqual(["Wynagrodzenie"]);
  });

  it("shows the static NBP hint for a foreign currency while the rates load", () => {
    useCurrencyRatesMock.mockReturnValue({ status: "loading" });
    renderDialog();
    const hint = "Przeliczenie po bieżącym kursie NBP dla walut obcych";

    expect(screen.queryByText(hint)).toBeNull();

    fill("Waluta", "EUR");

    expect(screen.getByText(hint)).toBeTruthy();
    expect(screen.getByLabelText(AMOUNT).getAttribute("aria-describedby")).toBe(
      screen.getByText(hint).id,
    );

    fill("Waluta", "PLN");

    expect(screen.queryByText(hint)).toBeNull();
  });

  it("shows the NBP rate and the PLN estimate for a foreign currency", () => {
    renderDialog();

    fill("Waluta", "EUR");

    const rateOnly = screen.getByText(
      `Kurs średni NBP z 17.11.2026: 4,3100. ${SERVER_NOTE}`,
    );
    expect(screen.getByLabelText(AMOUNT).getAttribute("aria-describedby")).toBe(
      rateOnly.id,
    );

    fill(AMOUNT, "100");

    expect(
      screen.getByText(
        `≈ 431,00 PLN wg kursu średniego NBP z 17.11.2026 (4,3100). ${SERVER_NOTE}`,
      ),
    ).toBeTruthy();

    fill("Waluta", "PLN");

    expect(screen.queryByText(/NBP/)).toBeNull();
  });

  it("shows a message under each empty required field and focuses the first", () => {
    const { onSubmit } = renderDialog();

    clickSave();

    expect(
      screen.getAllByRole("alert").map((alert) => alert.textContent),
    ).toEqual(["Podaj kwotę.", "Podaj opis transakcji.", "Wybierz kategorię."]);
    expect(screen.getByLabelText(AMOUNT).getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(screen.getByLabelText(CATEGORY).getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(document.activeElement).toBe(screen.getByLabelText(AMOUNT));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("focuses the first invalid field when the amount is fine", () => {
    renderDialog();
    fill(AMOUNT, "10");

    clickSave();

    expect(document.activeElement).toBe(screen.getByLabelText(DESCRIPTION));
  });

  it("asks for a date when it was cleared", () => {
    renderDialog();
    fillValidForm();
    fill(DATE, "");

    clickSave();

    expect(screen.getByRole("alert").textContent).toBe(
      "Wybierz datę transakcji.",
    );
    expect(document.activeElement).toBe(screen.getByLabelText(DATE));
  });

  it.each([
    ["abc", "Wpisz kwotę w formacie 184,50"],
    ["1,234", "Wpisz kwotę w formacie 184,50"],
    ["12345678901", "Wpisz kwotę w formacie 184,50"],
    ["0", "Kwota musi być większa od zera."],
    ["0,00", "Kwota musi być większa od zera."],
  ])("rejects the amount %s", (amount, message) => {
    const { onSubmit } = renderDialog();
    fillValidForm();
    fill(AMOUNT, amount);

    clickSave();

    expect(screen.getByRole("alert").textContent).toContain(message);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a blank and a too long description", () => {
    const { onSubmit } = renderDialog();
    fillValidForm();
    fill(DESCRIPTION, "   ");

    clickSave();

    expect(screen.getByRole("alert").textContent).toBe(
      "Podaj opis transakcji.",
    );

    fill(DESCRIPTION, "a".repeat(101));
    clickSave();

    expect(screen.getByRole("alert").textContent).toBe(
      "Opis może mieć maksymalnie 100 znaków.",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("removes the message of a field when it is edited", () => {
    renderDialog();
    clickSave();

    fill(AMOUNT, "5");

    expect(
      screen.getByLabelText(AMOUNT).getAttribute("aria-invalid"),
    ).toBeNull();
    expect(screen.getAllByRole("alert")).toHaveLength(2);
  });

  it.each([
    ["184,50", 184.5],
    ["184.50", 184.5],
  ])("submits the amount %s as the number %s", async (amount, expected) => {
    const { onSubmit } = renderDialog();
    fillValidForm();
    fill(AMOUNT, amount);

    await saveAndSettle();

    expect(onSubmit).toHaveBeenCalledWith({
      amount: expected,
      currency: "PLN",
      categoryId: 1,
      date: "2026-11-19",
      description: "Zakupy w Biedronce",
      type: "EXPENSE",
    });
  });

  it("takes the type from the category and renames the save button", async () => {
    const { onSubmit } = renderDialog();
    fillValidForm();
    fill(CATEGORY, "9");

    expect(screen.queryByRole("button", { name: "Zapisz wydatek" })).toBeNull();

    await saveAndSettle("Zapisz przychód");

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 9, type: "INCOME" }),
    );

    fill(CATEGORY, "2");

    expect(screen.getByRole("button", { name: "Zapisz wydatek" })).toBeTruthy();
  });

  it("submits the chosen currency and the trimmed description", async () => {
    const { onSubmit } = renderDialog();
    fillValidForm();
    fill("Waluta", "EUR");
    fill(DESCRIPTION, "  Kawa  ");

    await saveAndSettle();

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ currency: "EUR", description: "Kawa" }),
    );
  });

  it("only validates and stays open without an onSubmit callback", () => {
    renderDialog({ onSubmit: undefined });
    fillValidForm();

    clickSave();

    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      screen.getByRole("dialog", { name: "Dodaj nową transakcję" }),
    ).toBeTruthy();
  });

  it("disables the category and the save button while the categories load", () => {
    useCategoriesMock.mockReturnValue({ status: "loading" });
    renderDialog();

    expect(
      (screen.getByLabelText(CATEGORY) as HTMLSelectElement).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: "Zapisz wydatek",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("explains a failed category request and blocks saving", () => {
    useCategoriesMock.mockReturnValue({ status: "error" });
    renderDialog();

    expect(screen.getByRole("alert").textContent).toBe(
      "Nie udało się wczytać kategorii. Zamknij okno i spróbuj ponownie.",
    );
    expect(
      (
        screen.getByRole("button", {
          name: "Zapisz wydatek",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("closes through the close icon, Anuluj and the cancel event", () => {
    const { onClose } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Zamknij" }));
    fireEvent.click(screen.getByRole("button", { name: "Anuluj" }));
    fireEvent(
      screen.getByRole("dialog"),
      new Event("cancel", { cancelable: true }),
    );

    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("styles Anuluj with the slate-300 border", () => {
    renderDialog();

    expect(screen.getByRole("button", { name: "Anuluj" }).className).toContain(
      "border-slate-300",
    );
  });

  it("disables the save button and shows the saving label until the answer", async () => {
    let resolveSubmit: () => void = () => undefined;
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    renderDialog({ onSubmit });
    fillValidForm();

    await saveAndSettle();

    const saving = screen.getByRole("button", {
      name: "Zapisywanie…",
    }) as HTMLButtonElement;
    expect(saving.disabled).toBe(true);

    await act(async () => resolveSubmit());

    expect(
      (
        screen.getByRole("button", {
          name: "Zapisz wydatek",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });

  it("does not send a second request while the first one is pending", async () => {
    const onSubmit = vi.fn(() => new Promise<void>(() => undefined));
    renderDialog({ onSubmit });
    fillValidForm();
    const form = screen
      .getByRole("dialog")
      .querySelector("form") as HTMLFormElement;

    await act(async () => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    clickSave("Zapisywanie…");

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      "a 400 with detail",
      new ApiError(400, {
        status: 400,
        detail: "Typ kategorii nie zgadza się z typem transakcji.",
      }),
      "Typ kategorii nie zgadza się z typem transakcji.",
    ],
    [
      "a 503 with detail",
      new ApiError(503, {
        status: 503,
        detail:
          "Nie udało się pobrać kursu waluty. Spróbuj ponownie za chwilę albo wybierz walutę PLN.",
      }),
      "Nie udało się pobrać kursu waluty. Spróbuj ponownie za chwilę albo wybierz walutę PLN.",
    ],
    ["a network failure", new NetworkError(), NETWORK_ERROR_MESSAGE],
  ])(
    "keeps the dialog open with the data and explains %s",
    async (_name, error, message) => {
      const onSubmit = vi.fn().mockRejectedValue(error);
      renderDialog({ onSubmit });
      fillValidForm();

      await saveAndSettle();

      const alert = screen.getByRole("alert");
      expect(alert.textContent).toContain(message);
      expect(document.activeElement).toBe(alert);
      expect(
        screen.getByRole("dialog", { name: "Dodaj nową transakcję" }),
      ).toBeTruthy();
      expect(valueOf(AMOUNT)).toBe("184,50");
      expect(
        (
          screen.getByRole("button", {
            name: "Zapisz wydatek",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false);
    },
  );

  it("removes the failure message when a field is edited", async () => {
    renderDialog({ onSubmit: vi.fn().mockRejectedValue(new NetworkError()) });
    fillValidForm();
    await saveAndSettle();

    fill(DESCRIPTION, "Inny opis");

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("removes the failure message when the next request starts", async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValueOnce(new NetworkError())
      .mockReturnValueOnce(new Promise<void>(() => undefined));
    renderDialog({ onSubmit });
    fillValidForm();
    await saveAndSettle();
    expect(screen.getByRole("alert")).toBeTruthy();

    await saveAndSettle();

    expect(screen.queryByRole("alert")).toBeNull();
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });
});
