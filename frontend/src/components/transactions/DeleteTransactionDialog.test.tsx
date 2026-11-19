import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { DeleteTransactionDialog } from "@/components/transactions/DeleteTransactionDialog";
import { ApiError } from "@/lib/api/errors";
import { installDialogStub } from "@/test-utils/dialog";
import { EXPENSE_EUR, EXPENSE_PLN } from "@/test-utils/transactions";
import type { TransactionResponse } from "@/types/api";

function makeConfirm() {
  return vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
}

function renderDialog(
  onConfirm: () => Promise<void> = makeConfirm(),
  transaction: TransactionResponse = EXPENSE_PLN,
) {
  const onClose = vi.fn();
  render(
    <DeleteTransactionDialog
      transaction={transaction}
      onClose={onClose}
      onConfirm={onConfirm}
    />,
  );
  return { onClose };
}

async function clickDelete() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Usuń" }));
  });
}

describe("DeleteTransactionDialog", () => {
  beforeAll(installDialogStub);

  it("asks the question and describes the transaction", () => {
    renderDialog();
    const dialog = screen.getByRole("dialog", { name: "Usuń transakcję" });

    expect(
      within(dialog).getByText("Czy na pewno chcesz usunąć tę transakcję?"),
    ).toBeTruthy();
    expect(
      within(dialog).getByText("Zakupy w Biedronce, 17.11.2026"),
    ).toBeTruthy();
    expect(within(dialog).getByText(/184,50/)).toBeTruthy();
    expect(
      within(dialog).getByText("Tej operacji nie można cofnąć."),
    ).toBeTruthy();
  });

  it("shows the amount in the PLN equivalent for a foreign currency transaction", () => {
    renderDialog(makeConfirm(), EXPENSE_EUR);

    expect(screen.getByText("Bilety lotnicze, 12.11.2026")).toBeTruthy();
    expect(screen.getByText(/431,00/)).toBeTruthy();
  });

  it("puts the focus on the safe action, Anuluj", () => {
    renderDialog();

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Anuluj" }),
    );
  });

  it("calls onConfirm once and does not close by itself", async () => {
    const onConfirm = makeConfirm();
    const { onClose } = renderDialog(onConfirm);

    await clickDelete();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes without confirming on Anuluj", () => {
    const onConfirm = makeConfirm();
    const { onClose } = renderDialog(onConfirm);

    fireEvent.click(screen.getByRole("button", { name: "Anuluj" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("closes without confirming on the close button", () => {
    const onConfirm = makeConfirm();
    const { onClose } = renderDialog(onConfirm);

    fireEvent.click(screen.getByRole("button", { name: "Zamknij" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("disables the button, shows the progress label and ignores a second click while deleting", async () => {
    let finish: () => void = () => undefined;
    const onConfirm = vi.fn<() => Promise<void>>().mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    renderDialog(onConfirm);
    const button = screen.getByRole("button", { name: "Usuń" });

    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const busy = screen.getByRole("button", { name: "Usuwanie…" });
    expect((busy as HTMLButtonElement).disabled).toBe(true);

    await act(async () => {
      finish();
    });
  });

  it("keeps Anuluj working while deleting", async () => {
    const onConfirm = vi
      .fn<() => Promise<void>>()
      .mockReturnValue(new Promise<void>(() => undefined));
    const { onClose } = renderDialog(onConfirm);

    await clickDelete();
    fireEvent.click(screen.getByRole("button", { name: "Anuluj" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stays open, shows the detail and focuses the message when deleting fails", async () => {
    const onConfirm = vi
      .fn<() => Promise<void>>()
      .mockRejectedValue(
        new ApiError(404, { status: 404, detail: "Nie znaleziono zasobu." }),
      );
    renderDialog(onConfirm);

    await clickDelete();

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Nie znaleziono zasobu.");
    expect(document.activeElement).toBe(alert);
    expect(screen.getByRole("dialog")).toBeTruthy();
    const button = screen.getByRole("button", { name: "Usuń" });
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });

  it("clears the message on the next attempt", async () => {
    const onConfirm = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new ApiError(500, { status: 500, detail: "Błąd" }))
      .mockReturnValueOnce(new Promise<void>(() => undefined));
    renderDialog(onConfirm);

    await clickDelete();
    expect(screen.getByRole("alert")).toBeTruthy();

    await clickDelete();

    expect(screen.queryByRole("alert")).toBeNull();
  });
});
