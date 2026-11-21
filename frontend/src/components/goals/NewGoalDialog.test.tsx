import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { NewGoalDialog } from "@/components/goals/NewGoalDialog";
import {
  ApiError,
  NETWORK_ERROR_MESSAGE,
  NetworkError,
} from "@/lib/api/errors";
import { installDialogStub } from "@/test-utils/dialog";
import type { SavingsGoalRequest } from "@/types/api";

type Submit = (request: SavingsGoalRequest) => Promise<void>;

const TODAY = "2026-11-21";
const NAME = "Nazwa celu *";
const AMOUNT = "Kwota docelowa (PLN) *";
const DATE = "Termin realizacji celu *";
// Copied from SavingsGoalDates (backend).
const NOT_FUTURE =
  "Termin celu musi być w przyszłości. Wybierz datę późniejszą niż dzisiejsza.";
const TOO_LATE =
  "Termin celu może przypadać najpóźniej 31.12.2100. Wybierz wcześniejszą datę.";

function renderDialog(onSubmit: Submit = () => Promise.resolve()) {
  const onClose = vi.fn();
  const submit = vi.fn<Submit>(onSubmit);
  render(<NewGoalDialog today={TODAY} onClose={onClose} onSubmit={submit} />);
  return { onClose, onSubmit: submit };
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillAll(name: string, amount: string, date: string) {
  fill(NAME, name);
  fill(AMOUNT, amount);
  fill(DATE, date);
}

async function save() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Zapisz cel" }));
  });
}

function valueOf(label: string): string {
  return (screen.getByLabelText(label) as HTMLInputElement).value;
}

describe("NewGoalDialog", () => {
  beforeAll(installDialogStub);

  it("renders the title and the three fields, and focuses the name", () => {
    renderDialog();

    expect(screen.getByRole("dialog", { name: "Nowy cel" })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText(NAME));
    expect(screen.getByLabelText(AMOUNT)).toBeTruthy();
    expect(screen.getByLabelText(DATE)).toBeTruthy();
  });

  it("has no currency control: the currency is in the label of the amount", () => {
    renderDialog();

    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByLabelText(/Waluta/)).toBeNull();
  });

  it("limits the name to 100 characters and the amount to the backend format", () => {
    renderDialog();

    expect(screen.getByLabelText(NAME).getAttribute("maxlength")).toBe("100");
    expect(screen.getByLabelText(AMOUNT).getAttribute("maxlength")).toBe("13");
  });

  it("offers dates from tomorrow to 2100-12-31 in the date picker", () => {
    renderDialog();

    const date = screen.getByLabelText(DATE);
    expect(date.getAttribute("type")).toBe("date");
    expect(date.getAttribute("min")).toBe("2026-11-22");
    expect(date.getAttribute("max")).toBe("2100-12-31");
  });

  it("gives the fields the input-border token", () => {
    renderDialog();

    for (const label of [NAME, AMOUNT, DATE]) {
      expect(screen.getByLabelText(label).className).toContain(
        "border-input-border",
      );
    }
  });

  it("sends nothing, shows the three messages and focuses the name when the form is empty", async () => {
    const { onSubmit } = renderDialog();

    await save();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByRole("alert").map((a) => a.textContent)).toEqual([
      "Nazwa celu jest wymagana",
      "Podaj kwotę.",
      "Termin celu jest wymagany",
    ]);
    expect(document.activeElement).toBe(screen.getByLabelText(NAME));
  });

  it.each([
    ["2026-11-21", NOT_FUTURE],
    ["2026-11-20", NOT_FUTURE],
    ["2101-01-01", TOO_LATE],
  ])(
    "does not send the date %s, shows its message at the date and focuses it",
    async (date, message) => {
      const { onSubmit } = renderDialog();

      fillAll("Wakacje", "6000", date);
      await save();

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByRole("alert").textContent).toBe(message);
      expect(screen.getByLabelText(DATE).getAttribute("aria-invalid")).toBe(
        "true",
      );
      expect(document.activeElement).toBe(screen.getByLabelText(DATE));
    },
  );

  it("sends the trimmed name, the amount as a number and the date", async () => {
    const { onSubmit } = renderDialog();

    fillAll("  Wakacje we Włoszech  ", "6000,5", "2100-12-31");
    await save();

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Wakacje we Włoszech",
      targetAmount: 6000.5,
      targetDate: "2100-12-31",
    });
  });

  it("clears the message of a field when it is edited", async () => {
    renderDialog();

    await save();
    fill(NAME, "Rower");

    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(screen.getByLabelText(NAME).getAttribute("aria-invalid")).toBeNull();
  });

  it("shows 400 field errors at the fields, focuses the first and keeps the values", async () => {
    renderDialog(() =>
      Promise.reject(
        new ApiError(400, {
          status: 400,
          fieldErrors: [
            { field: "targetDate", message: NOT_FUTURE },
            { field: "name", message: "Nazwa celu jest wymagana" },
          ],
        }),
      ),
    );

    fillAll("Wakacje", "6000", "2027-07-21");
    await save();

    expect(screen.getAllByRole("alert").map((a) => a.textContent)).toEqual([
      "Nazwa celu jest wymagana",
      NOT_FUTURE,
    ]);
    expect(document.activeElement).toBe(screen.getByLabelText(NAME));
    expect(valueOf(NAME)).toBe("Wakacje");
    expect(valueOf(AMOUNT)).toBe("6000");
    expect(screen.getByRole("dialog", { name: "Nowy cel" })).toBeTruthy();
  });

  it("shows the detail of a 500 in the dialog and keeps the values", async () => {
    renderDialog(() =>
      Promise.reject(
        new ApiError(500, { status: 500, detail: "Błąd serwera." }),
      ),
    );

    fillAll("Wakacje", "6000", "2027-07-21");
    await save();

    expect(screen.getByRole("alert").textContent).toBe("Błąd serwera.");
    expect(valueOf(NAME)).toBe("Wakacje");
  });

  it("shows a network failure in the dialog", async () => {
    renderDialog(() => Promise.reject(new NetworkError()));

    fillAll("Wakacje", "6000", "2027-07-21");
    await save();

    expect(screen.getByRole("alert").textContent).toBe(NETWORK_ERROR_MESSAGE);
  });

  it("blocks a second submit while the request is pending", async () => {
    let resolveSubmit: () => void = () => {};
    const pending = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    const { onSubmit } = renderDialog(() => pending);

    fillAll("Wakacje", "6000", "2027-07-21");
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
    expect(screen.getByRole("button", { name: "Zapisz cel" })).toBeTruthy();
  });

  it("closes with Anuluj without sending anything", () => {
    const { onClose, onSubmit } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Anuluj" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
