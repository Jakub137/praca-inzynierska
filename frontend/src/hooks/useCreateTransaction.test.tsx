import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  TRANSACTION_SAVED_MESSAGE,
  useCreateTransaction,
} from "@/hooks/useCreateTransaction";
import { ApiError } from "@/lib/api/errors";
import { EXPENSE_PLN } from "@/test-utils/transactions";
import type {
  CreateTransactionRequest,
  TransactionResponse,
} from "@/types/api";

const createTransactionMock = vi.hoisted(() =>
  vi.fn<
    (
      token: string,
      request: CreateTransactionRequest,
    ) => Promise<TransactionResponse>
  >(),
);
const readSessionTokenMock = vi.hoisted(() =>
  vi.fn<() => string | undefined>(),
);
const showToastMock = vi.hoisted(() => vi.fn<(message: string) => void>());

vi.mock("@/lib/api/transactions", () => ({
  createTransaction: createTransactionMock,
}));
vi.mock("@/lib/auth/session", () => ({
  readSessionToken: readSessionTokenMock,
}));
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

const REQUEST: CreateTransactionRequest = {
  amount: 184.5,
  currency: "PLN",
  categoryId: 1,
  date: "2026-11-19",
  description: "Zakupy w Biedronce",
  type: "EXPENSE",
};

function renderCreate() {
  const onCreated = vi.fn();
  const { result } = renderHook(() => useCreateTransaction({ onCreated }));
  return { create: result.current, onCreated };
}

describe("useCreateTransaction", () => {
  beforeEach(() => {
    createTransactionMock.mockReset();
    readSessionTokenMock.mockReset();
    showToastMock.mockReset();
    readSessionTokenMock.mockReturnValue("token");
  });

  it("posts with the session token, then notifies the list, then shows the toast", async () => {
    createTransactionMock.mockResolvedValue(EXPENSE_PLN);
    const { create, onCreated } = renderCreate();

    await create(REQUEST);

    expect(createTransactionMock).toHaveBeenCalledWith("token", REQUEST);
    expect(showToastMock).toHaveBeenCalledWith(
      "Transakcja została zapisana pomyślnie",
    );
    expect(TRANSACTION_SAVED_MESSAGE).toBe(
      "Transakcja została zapisana pomyślnie",
    );
    const [createdOrder = 0] = onCreated.mock.invocationCallOrder;
    const [toastOrder = 0] = showToastMock.mock.invocationCallOrder;
    expect(createdOrder).toBeGreaterThan(0);
    expect(createdOrder).toBeLessThan(toastOrder);
  });

  it("rejects without notifying or showing a toast when the request fails", async () => {
    const failure = new ApiError(400, { status: 400, detail: "Błąd" });
    createTransactionMock.mockRejectedValue(failure);
    const { create, onCreated } = renderCreate();

    await expect(create(REQUEST)).rejects.toBe(failure);

    expect(onCreated).not.toHaveBeenCalled();
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it("rejects without a request when there is no session token", async () => {
    readSessionTokenMock.mockReturnValue(undefined);
    const { create, onCreated } = renderCreate();

    await expect(create(REQUEST)).rejects.toThrow("Missing session token");

    expect(createTransactionMock).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
    expect(showToastMock).not.toHaveBeenCalled();
  });
});
