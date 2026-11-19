import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  TRANSACTION_UPDATED_MESSAGE,
  useUpdateTransaction,
} from "@/hooks/useUpdateTransaction";
import { ApiError } from "@/lib/api/errors";
import { EXPENSE_PLN } from "@/test-utils/transactions";
import type {
  TransactionResponse,
  UpdateTransactionRequest,
} from "@/types/api";

const updateTransactionMock = vi.hoisted(() =>
  vi.fn<
    (
      token: string,
      id: string,
      request: UpdateTransactionRequest,
    ) => Promise<TransactionResponse>
  >(),
);
const readSessionTokenMock = vi.hoisted(() =>
  vi.fn<() => string | undefined>(),
);
const showToastMock = vi.hoisted(() => vi.fn<(message: string) => void>());

vi.mock("@/lib/api/transactions", () => ({
  updateTransaction: updateTransactionMock,
}));
vi.mock("@/lib/auth/session", () => ({
  readSessionToken: readSessionTokenMock,
}));
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

const ID = EXPENSE_PLN.id;
const REQUEST: UpdateTransactionRequest = {
  amount: 200,
  currency: "PLN",
  categoryId: 1,
  date: "2026-11-19",
  description: "Zakupy w Biedronce",
  type: "EXPENSE",
};

function renderUpdate() {
  const onUpdated = vi.fn();
  const { result } = renderHook(() => useUpdateTransaction({ onUpdated }));
  return { update: result.current, onUpdated };
}

describe("useUpdateTransaction", () => {
  beforeEach(() => {
    updateTransactionMock.mockReset();
    readSessionTokenMock.mockReset();
    showToastMock.mockReset();
    readSessionTokenMock.mockReturnValue("token");
  });

  it("puts with the session token, then notifies the list with the id, then shows the toast", async () => {
    updateTransactionMock.mockResolvedValue(EXPENSE_PLN);
    const { update, onUpdated } = renderUpdate();

    await update(ID, REQUEST);

    expect(updateTransactionMock).toHaveBeenCalledWith("token", ID, REQUEST);
    expect(onUpdated).toHaveBeenCalledWith(ID);
    expect(showToastMock).toHaveBeenCalledWith(
      "Transakcja została zaktualizowana",
    );
    expect(TRANSACTION_UPDATED_MESSAGE).toBe(
      "Transakcja została zaktualizowana",
    );
    const [updatedOrder = 0] = onUpdated.mock.invocationCallOrder;
    const [toastOrder = 0] = showToastMock.mock.invocationCallOrder;
    expect(updatedOrder).toBeGreaterThan(0);
    expect(updatedOrder).toBeLessThan(toastOrder);
  });

  it("rejects without notifying or showing a toast when the request fails", async () => {
    const failure = new ApiError(503, { status: 503, detail: "Błąd" });
    updateTransactionMock.mockRejectedValue(failure);
    const { update, onUpdated } = renderUpdate();

    await expect(update(ID, REQUEST)).rejects.toBe(failure);

    expect(onUpdated).not.toHaveBeenCalled();
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it("rejects without a request when there is no session token", async () => {
    readSessionTokenMock.mockReturnValue(undefined);
    const { update, onUpdated } = renderUpdate();

    await expect(update(ID, REQUEST)).rejects.toThrow("Missing session token");

    expect(updateTransactionMock).not.toHaveBeenCalled();
    expect(onUpdated).not.toHaveBeenCalled();
    expect(showToastMock).not.toHaveBeenCalled();
  });
});
