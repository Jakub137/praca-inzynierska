import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  RECURRING_PAYMENT_CREATED_MESSAGE,
  useCreateRecurringPayment,
} from "@/hooks/useCreateRecurringPayment";
import { ApiError } from "@/lib/api/errors";
import { NETFLIX_PAYMENT } from "@/test-utils/recurringPayments";
import type {
  RecurringPaymentRequest,
  RecurringPaymentResponse,
} from "@/types/api";

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
const showToastMock = vi.hoisted(() => vi.fn<(message: string) => void>());

vi.mock("@/lib/api/recurringPayments", () => ({
  createRecurringPayment: createRecurringPaymentMock,
}));
vi.mock("@/lib/auth/session", () => ({
  readSessionToken: readSessionTokenMock,
}));
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

const REQUEST: RecurringPaymentRequest = {
  name: "Netflix",
  amount: 43,
  currency: "PLN",
  frequency: "MONTHLY",
  nextDueDate: "2026-12-01",
  categoryId: 2,
};

function renderSave() {
  const onSaved = vi.fn();
  const { result } = renderHook(() => useCreateRecurringPayment({ onSaved }));
  return { save: result.current, onSaved };
}

describe("useCreateRecurringPayment", () => {
  beforeEach(() => {
    createRecurringPaymentMock.mockReset();
    readSessionTokenMock.mockReset();
    showToastMock.mockReset();
    readSessionTokenMock.mockReturnValue("token");
  });

  it("posts with the session token, notifies the view, then shows the toast", async () => {
    createRecurringPaymentMock.mockResolvedValue(NETFLIX_PAYMENT);
    const { save, onSaved } = renderSave();

    await save(REQUEST);

    expect(createRecurringPaymentMock).toHaveBeenCalledWith("token", REQUEST);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledWith("Dodano płatność cykliczną");
    const [savedOrder = 0] = onSaved.mock.invocationCallOrder;
    const [toastOrder = 0] = showToastMock.mock.invocationCallOrder;
    expect(savedOrder).toBeGreaterThan(0);
    expect(savedOrder).toBeLessThan(toastOrder);
  });

  it("exports the toast text", () => {
    expect(RECURRING_PAYMENT_CREATED_MESSAGE).toBe("Dodano płatność cykliczną");
  });

  it("rejects without notifying or showing a toast when the request fails", async () => {
    const failure = new ApiError(400, { status: 400 });
    createRecurringPaymentMock.mockRejectedValue(failure);
    const { save, onSaved } = renderSave();

    await expect(save(REQUEST)).rejects.toBe(failure);

    expect(onSaved).not.toHaveBeenCalled();
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it("rejects without a request when there is no session token", async () => {
    readSessionTokenMock.mockReturnValue(undefined);
    const { save, onSaved } = renderSave();

    await expect(save(REQUEST)).rejects.toThrow("Missing session token");

    expect(createRecurringPaymentMock).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(showToastMock).not.toHaveBeenCalled();
  });
});
