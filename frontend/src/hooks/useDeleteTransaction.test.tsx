import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  TRANSACTION_DELETED_MESSAGE,
  useDeleteTransaction,
} from "@/hooks/useDeleteTransaction";
import { ApiError } from "@/lib/api/errors";
import { EXPENSE_PLN } from "@/test-utils/transactions";

const deleteTransactionMock = vi.hoisted(() =>
  vi.fn<(token: string, id: string) => Promise<void>>(),
);
const readSessionTokenMock = vi.hoisted(() =>
  vi.fn<() => string | undefined>(),
);
const showToastMock = vi.hoisted(() => vi.fn<(message: string) => void>());

vi.mock("@/lib/api/transactions", () => ({
  deleteTransaction: deleteTransactionMock,
}));
vi.mock("@/lib/auth/session", () => ({
  readSessionToken: readSessionTokenMock,
}));
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

function renderDelete() {
  const onDeleted = vi.fn();
  const { result } = renderHook(() => useDeleteTransaction({ onDeleted }));
  return { remove: result.current, onDeleted };
}

describe("useDeleteTransaction", () => {
  beforeEach(() => {
    deleteTransactionMock.mockReset();
    readSessionTokenMock.mockReset();
    showToastMock.mockReset();
    readSessionTokenMock.mockReturnValue("token");
  });

  it("deletes with the session token, then notifies the list, then shows the toast", async () => {
    deleteTransactionMock.mockResolvedValue(undefined);
    const { remove, onDeleted } = renderDelete();

    await remove(EXPENSE_PLN.id);

    expect(deleteTransactionMock).toHaveBeenCalledWith("token", EXPENSE_PLN.id);
    expect(showToastMock).toHaveBeenCalledWith("Transakcja została usunięta");
    expect(TRANSACTION_DELETED_MESSAGE).toBe("Transakcja została usunięta");
    const [deletedOrder = 0] = onDeleted.mock.invocationCallOrder;
    const [toastOrder = 0] = showToastMock.mock.invocationCallOrder;
    expect(deletedOrder).toBeGreaterThan(0);
    expect(deletedOrder).toBeLessThan(toastOrder);
  });

  it("rejects without notifying or showing a toast when the request fails", async () => {
    const failure = new ApiError(404, { status: 404, detail: "Błąd" });
    deleteTransactionMock.mockRejectedValue(failure);
    const { remove, onDeleted } = renderDelete();

    await expect(remove(EXPENSE_PLN.id)).rejects.toBe(failure);

    expect(onDeleted).not.toHaveBeenCalled();
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it("rejects without a request when there is no session token", async () => {
    readSessionTokenMock.mockReturnValue(undefined);
    const { remove, onDeleted } = renderDelete();

    await expect(remove(EXPENSE_PLN.id)).rejects.toThrow(
      "Missing session token",
    );

    expect(deleteTransactionMock).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
    expect(showToastMock).not.toHaveBeenCalled();
  });
});
