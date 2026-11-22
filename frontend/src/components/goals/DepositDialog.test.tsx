import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { DepositDialog } from "@/components/goals/DepositDialog";
import { ApiError } from "@/lib/api/errors";
import { installDialogStub } from "@/test-utils/dialog";
import { ACTIVE_GOAL, COMPLETED_GOAL } from "@/test-utils/goals";
import type { DepositToGoalRequest, SavingsGoalResponse } from "@/types/api";

type Submit = (request: DepositToGoalRequest) => Promise<void>;

// formatPln groups thousands with a non-breaking space; an escape survives copying the plan.
const NBSP = "\u00a0";
const AMOUNT = "Kwota wpłaty (PLN) *";
// Copied from SavingsGoalEntity (backend).
const TOTAL_TOO_LARGE =
  "Suma wpłat na ten cel nie może przekroczyć 9 999 999 999,99. Wpisz mniejszą kwotę.";

function renderDialog(
  onSubmit: Submit = () => Promise.resolve(),
  goal: SavingsGoalResponse = ACTIVE_GOAL,
) {
  const onClose = vi.fn();
  const submit = vi.fn<Submit>(onSubmit);
  render(<DepositDialog goal={goal} onClose={onClose} onSubmit={submit} />);
  return { onClose, onSubmit: submit };
}

function fill(value: string) {
  fireEvent.change(screen.getByLabelText(AMOUNT), { target: { value } });
}

async function deposit() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Wpłać" }));
  });
}

describe("DepositDialog", () => {
  beforeAll(installDialogStub);

  it("names the goal in the title, shows the progress and focuses the amount", () => {
    renderDialog();

    const dialog = screen.getByRole("dialog", {
      name: "Wpłata na cel: Wakacje we Włoszech",
    });
    expect(dialog.textContent).toContain(
      `Zebrano 4${NBSP}500,00 zł z 6${NBSP}000,00 zł`,
    );
    expect(document.activeElement).toBe(screen.getByLabelText(AMOUNT));
  });

  it("has one field, with the currency in its label, limited to the backend format", () => {
    renderDialog();

    const amount = screen.getByLabelText(AMOUNT);
    expect(amount.getAttribute("maxlength")).toBe("13");
    expect(amount.className).toContain("border-input-border");
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it.each([
    ["", "Podaj kwotę."],
    ["0", "Kwota musi być większa od zera."],
    [
      "abc",
      "Wpisz kwotę w formacie 184,50 (maksymalnie 10 cyfr przed i 2 po przecinku).",
    ],
  ])(
    "sends nothing and shows the message for %j at the amount",
    async (value, message) => {
      const { onSubmit } = renderDialog();

      fill(value);
      await deposit();

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByRole("alert").textContent).toBe(message);
      expect(screen.getByLabelText(AMOUNT).getAttribute("aria-invalid")).toBe(
        "true",
      );
      expect(document.activeElement).toBe(screen.getByLabelText(AMOUNT));
    },
  );

  it("sends the amount as a number", async () => {
    const { onSubmit } = renderDialog();

    fill("250,5");
    await deposit();

    expect(onSubmit).toHaveBeenCalledWith({ amount: 250.5 });
  });

  it("allows a deposit on a completed goal", async () => {
    const { onSubmit } = renderDialog(() => Promise.resolve(), COMPLETED_GOAL);

    fill("100");
    await deposit();

    expect(onSubmit).toHaveBeenCalledWith({ amount: 100 });
  });

  it("shows the message about the total above the limit at the amount and keeps the dialog", async () => {
    renderDialog(() =>
      Promise.reject(
        new ApiError(400, {
          status: 400,
          fieldErrors: [{ field: "amount", message: TOTAL_TOO_LARGE }],
        }),
      ),
    );

    fill("9999999999,99");
    await deposit();

    expect(screen.getByRole("alert").textContent).toBe(TOTAL_TOO_LARGE);
    expect(screen.getByLabelText(AMOUNT).getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect((screen.getByLabelText(AMOUNT) as HTMLInputElement).value).toBe(
      "9999999999,99",
    );
    expect(document.activeElement).toBe(screen.getByLabelText(AMOUNT));
  });

  it("shows the detail of a 404 in the dialog and keeps the amount", async () => {
    renderDialog(() =>
      Promise.reject(
        new ApiError(404, { status: 404, detail: "Nie znaleziono celu." }),
      ),
    );

    fill("250");
    await deposit();

    expect(screen.getByRole("alert").textContent).toBe("Nie znaleziono celu.");
    expect((screen.getByLabelText(AMOUNT) as HTMLInputElement).value).toBe(
      "250",
    );
  });

  it("blocks a second submit while the request is pending", async () => {
    let resolveSubmit: () => void = () => {};
    const pending = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    const { onSubmit } = renderDialog(() => pending);

    fill("250");
    await deposit();
    expect(
      (
        screen.getByRole("button", {
          name: "Zapisywanie…",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.submit(
      screen.getByRole("dialog").querySelector("form") as Element,
    );
    await act(async () => {
      resolveSubmit();
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("closes with Anuluj without sending anything", () => {
    const { onClose, onSubmit } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Anuluj" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
