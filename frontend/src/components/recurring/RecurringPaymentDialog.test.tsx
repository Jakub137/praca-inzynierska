import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { RecurringPaymentDialog } from "@/components/recurring/RecurringPaymentDialog";
import type { CategoriesState } from "@/hooks/useCategories";
import {
  ApiError,
  NETWORK_ERROR_MESSAGE,
  NetworkError,
} from "@/lib/api/errors";
import { TEST_CATEGORIES } from "@/test-utils/categories";
import { installDialogStub } from "@/test-utils/dialog";
import type { RecurringPaymentRequest } from "@/types/api";

const useCategoriesMock = vi.hoisted(() => vi.fn<() => CategoriesState>());

vi.mock("@/hooks/useCategories", () => ({
  useCategories: useCategoriesMock,
}));

type Submit = (request: RecurringPaymentRequest) => Promise<void>;

const TODAY = "2026-11-21";
const NAME = "Nazwa płatności *";
const AMOUNT = "Kwota *";
const CURRENCY = "Waluta";
const CATEGORY = "Kategoria *";
const FREQUENCY = "Cykl rozliczeniowy *";
const DATE = "Data najbliższej płatności *";
// Copied from RecurringPaymentDates and ErrorMessages (backend).
const PAST =
  "Termin następnej płatności nie może być w przeszłości. Wybierz dzisiejszą lub późniejszą datę.";
const TOO_LATE =
  "Termin następnej płatności może przypadać najpóźniej 31.12.2100. Wybierz wcześniejszą datę.";
const NOT_EXPENSE =
  "Płatność cykliczną można przypisać tylko do kategorii wydatków. Wybierz kategorię wydatków.";

function renderDialog(onSubmit: Submit = () => Promise.resolve()) {
  const onClose = vi.fn();
  const submit = vi.fn<Submit>(onSubmit);
  render(
    <RecurringPaymentDialog
      today={TODAY}
      onClose={onClose}
      onSubmit={submit}
    />,
  );
  return { onClose, onSubmit: submit };
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillRequired(name: string, amount: string, date: string) {
  fill(NAME, name);
  fill(AMOUNT, amount);
  fill(CATEGORY, "2");
  fill(DATE, date);
}

async function save() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Zapisz płatność" }));
  });
}

function valueOf(label: string): string {
  return (screen.getByLabelText(label) as HTMLInputElement).value;
}

function optionTexts(label: string): (string | null)[] {
  const select = screen.getByLabelText(label) as HTMLSelectElement;
  return Array.from(select.options).map((option) => option.textContent);
}

describe("RecurringPaymentDialog", () => {
  beforeAll(installDialogStub);

  beforeEach(() => {
    useCategoriesMock.mockReset();
    useCategoriesMock.mockReturnValue({
      status: "ready",
      categories: TEST_CATEGORIES,
    });
  });

  it("renders the title and the fields, and focuses the name", () => {
    renderDialog();

    expect(
      screen.getByRole("dialog", { name: "Dodaj płatność cykliczną" }),
    ).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText(NAME));
    for (const label of [AMOUNT, CURRENCY, CATEGORY, FREQUENCY, DATE]) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: "Anuluj" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Zapisz płatność" }),
    ).toBeTruthy();
  });

  it("offers the currencies and the frequencies with PLN and monthly chosen", () => {
    renderDialog();

    expect(optionTexts(CURRENCY)).toEqual([
      "PLN (zł)",
      "EUR (€)",
      "USD ($)",
      "GBP (£)",
      "CHF",
    ]);
    expect(valueOf(CURRENCY)).toBe("PLN");
    expect(optionTexts(FREQUENCY)).toEqual([
      "Co tydzień",
      "Co miesiąc",
      "Co rok",
    ]);
    expect(valueOf(FREQUENCY)).toBe("MONTHLY");
  });

  it("offers only the expense categories", () => {
    renderDialog();

    expect(optionTexts(CATEGORY)).toEqual([
      "Wybierz kategorię",
      "Artykuły spożywcze",
      "Rozrywka",
    ]);
  });

  it("limits the name to 100 characters and the amount to the backend format", () => {
    renderDialog();

    expect(screen.getByLabelText(NAME).getAttribute("maxlength")).toBe("100");
    expect(screen.getByLabelText(AMOUNT).getAttribute("maxlength")).toBe("13");
  });

  it("offers dates from today to 2100-12-31 in the date picker", () => {
    renderDialog();

    const date = screen.getByLabelText(DATE);
    expect(date.getAttribute("type")).toBe("date");
    expect(date.getAttribute("min")).toBe("2026-11-21");
    expect(date.getAttribute("max")).toBe("2100-12-31");
  });

  it("gives the fields the input-border token", () => {
    renderDialog();

    for (const label of [NAME, AMOUNT, CURRENCY, CATEGORY, FREQUENCY, DATE]) {
      expect(screen.getByLabelText(label).className).toContain(
        "border-input-border",
      );
    }
  });

  it("sends nothing, shows the four messages and focuses the name when the form is empty", async () => {
    const { onSubmit } = renderDialog();

    await save();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByRole("alert").map((a) => a.textContent)).toEqual([
      "Nazwa płatności jest wymagana",
      "Podaj kwotę.",
      "Kategoria jest wymagana",
      "Termin następnej płatności jest wymagany",
    ]);
    expect(document.activeElement).toBe(screen.getByLabelText(NAME));
  });

  it.each([
    ["2026-11-20", PAST],
    ["2101-01-01", TOO_LATE],
  ])(
    "does not send the date %s, shows its message at the date and focuses it",
    async (date, message) => {
      const { onSubmit } = renderDialog();

      fillRequired("Netflix", "43", date);
      await save();

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByRole("alert").textContent).toBe(message);
      expect(screen.getByLabelText(DATE).getAttribute("aria-invalid")).toBe(
        "true",
      );
      expect(document.activeElement).toBe(screen.getByLabelText(DATE));
    },
  );

  it("accepts today as the date of the next payment", async () => {
    const { onSubmit } = renderDialog();

    fillRequired("Czynsz", "850", TODAY);
    await save();

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("sends the trimmed name, the amount as a number and the chosen values", async () => {
    const { onSubmit } = renderDialog();

    fill(NAME, "  Spotify  ");
    fill(AMOUNT, "9,99");
    fill(CURRENCY, "EUR");
    fill(CATEGORY, "2");
    fill(FREQUENCY, "YEARLY");
    fill(DATE, "2100-12-31");
    await save();

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Spotify",
      amount: 9.99,
      currency: "EUR",
      frequency: "YEARLY",
      nextDueDate: "2100-12-31",
      categoryId: 2,
    });
  });

  it("sends PLN and monthly when the selects are left alone", async () => {
    const { onSubmit } = renderDialog();

    fillRequired("Netflix", "43", "2026-12-01");
    await save();

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Netflix",
      amount: 43,
      currency: "PLN",
      frequency: "MONTHLY",
      nextDueDate: "2026-12-01",
      categoryId: 2,
    });
  });

  it("clears the message of a field when it is edited", async () => {
    renderDialog();

    await save();
    fill(NAME, "Rower");

    expect(screen.getAllByRole("alert")).toHaveLength(3);
    expect(screen.getByLabelText(NAME).getAttribute("aria-invalid")).toBeNull();
  });

  it("shows 400 field errors at the fields, focuses the first and keeps the values", async () => {
    renderDialog(() =>
      Promise.reject(
        new ApiError(400, {
          status: 400,
          fieldErrors: [
            { field: "nextDueDate", message: PAST },
            { field: "name", message: "Nazwa płatności jest wymagana" },
          ],
        }),
      ),
    );

    fillRequired("Netflix", "43", "2026-12-01");
    await save();

    expect(screen.getAllByRole("alert").map((a) => a.textContent)).toEqual([
      "Nazwa płatności jest wymagana",
      PAST,
    ]);
    expect(document.activeElement).toBe(screen.getByLabelText(NAME));
    expect(valueOf(NAME)).toBe("Netflix");
    expect(valueOf(AMOUNT)).toBe("43");
    expect(
      screen.getByRole("dialog", { name: "Dodaj płatność cykliczną" }),
    ).toBeTruthy();
  });

  it("shows a 400 error of the frequency under the select and focuses it", async () => {
    renderDialog(() =>
      Promise.reject(
        new ApiError(400, {
          status: 400,
          fieldErrors: [
            { field: "frequency", message: "Częstotliwość jest wymagana" },
          ],
        }),
      ),
    );

    fillRequired("Netflix", "43", "2026-12-01");
    await save();

    expect(screen.getByRole("alert").textContent).toBe(
      "Częstotliwość jest wymagana",
    );
    expect(document.activeElement).toBe(screen.getByLabelText(FREQUENCY));
    expect(screen.getByLabelText(FREQUENCY).getAttribute("aria-invalid")).toBe(
      "true",
    );
  });

  it("shows the 400 for an income category in the dialog, not at a field", async () => {
    renderDialog(() =>
      Promise.reject(
        new ApiError(400, {
          status: 400,
          title: "Nieprawidłowa kategoria",
          detail: NOT_EXPENSE,
        }),
      ),
    );

    fillRequired("Netflix", "43", "2026-12-01");
    await save();

    expect(screen.getByRole("alert").textContent).toBe(NOT_EXPENSE);
    expect(
      screen.getByLabelText(CATEGORY).getAttribute("aria-invalid"),
    ).toBeNull();
    expect(valueOf(NAME)).toBe("Netflix");
  });

  it("shows the 404 for someone else's category in the dialog and keeps the values", async () => {
    // The text is arbitrary here: the dialog shows the detail it gets from the server.
    renderDialog(() =>
      Promise.reject(
        new ApiError(404, { status: 404, detail: "Nie znaleziono kategorii." }),
      ),
    );

    fillRequired("Netflix", "43", "2026-12-01");
    await save();

    expect(screen.getByRole("alert").textContent).toBe(
      "Nie znaleziono kategorii.",
    );
    expect(valueOf(NAME)).toBe("Netflix");
  });

  it("shows the detail of a 500 in the dialog and keeps the values", async () => {
    renderDialog(() =>
      Promise.reject(
        new ApiError(500, { status: 500, detail: "Błąd serwera." }),
      ),
    );

    fillRequired("Netflix", "43", "2026-12-01");
    await save();

    expect(screen.getByRole("alert").textContent).toBe("Błąd serwera.");
    expect(valueOf(NAME)).toBe("Netflix");
  });

  it("shows a network failure in the dialog", async () => {
    renderDialog(() => Promise.reject(new NetworkError()));

    fillRequired("Netflix", "43", "2026-12-01");
    await save();

    expect(screen.getByRole("alert").textContent).toBe(NETWORK_ERROR_MESSAGE);
  });

  it("blocks a second submit while the request is pending", async () => {
    let resolveSubmit: () => void = () => {};
    const pending = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    const { onSubmit } = renderDialog(() => pending);

    fillRequired("Netflix", "43", "2026-12-01");
    await save();
    const saving = screen.getByRole("button", {
      name: "Zapisywanie…",
    }) as HTMLButtonElement;
    expect(saving.disabled).toBe(true);
    fireEvent.submit(
      screen.getByRole("dialog").querySelector("form") as Element,
    );
    await act(async () => {
      resolveSubmit();
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Zapisz płatność" }),
    ).toBeTruthy();
  });

  it("closes with Anuluj without sending anything", () => {
    const { onClose, onSubmit } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Anuluj" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables the category select while the categories load", () => {
    useCategoriesMock.mockReturnValue({ status: "loading" });
    renderDialog();

    const select = screen.getByLabelText(CATEGORY) as HTMLSelectElement;
    expect(select.disabled).toBe(true);
    expect(optionTexts(CATEGORY)).toEqual(["Ładowanie kategorii…"]);
  });

  it("shows a message at the category select when the categories fail to load", () => {
    useCategoriesMock.mockReturnValue({ status: "error" });
    renderDialog();

    const select = screen.getByLabelText(CATEGORY) as HTMLSelectElement;
    expect(select.disabled).toBe(true);
    expect(optionTexts(CATEGORY)).toEqual(["Kategorie niedostępne"]);
    expect(screen.getByRole("alert").textContent).toBe(
      "Nie udało się wczytać kategorii. Zamknij okno i spróbuj ponownie.",
    );
  });
});
