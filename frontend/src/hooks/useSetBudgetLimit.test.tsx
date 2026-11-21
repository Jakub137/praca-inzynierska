import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LIMIT_CREATED_MESSAGE,
  LIMIT_UPDATED_MESSAGE,
  useSetBudgetLimit,
} from "@/hooks/useSetBudgetLimit";
import type { SetBudgetLimitResult } from "@/lib/api/budgets";
import { ApiError } from "@/lib/api/errors";
import type { SetBudgetLimitRequest } from "@/types/api";

const setBudgetLimitMock = vi.hoisted(() =>
  vi.fn<
    (
      token: string,
      request: SetBudgetLimitRequest,
    ) => Promise<SetBudgetLimitResult>
  >(),
);
const readSessionTokenMock = vi.hoisted(() =>
  vi.fn<() => string | undefined>(),
);
const showToastMock = vi.hoisted(() => vi.fn<(message: string) => void>());

vi.mock("@/lib/api/budgets", () => ({
  setBudgetLimit: setBudgetLimitMock,
}));
vi.mock("@/lib/auth/session", () => ({
  readSessionToken: readSessionTokenMock,
}));
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

const REQUEST: SetBudgetLimitRequest = {
  categoryId: 2,
  month: 11,
  year: 2026,
  limitAmount: 1200,
};

function resultOf(created: boolean): SetBudgetLimitResult {
  return { created, limit: { id: 7, ...REQUEST } };
}

function renderSave() {
  const onSaved = vi.fn();
  const { result } = renderHook(() => useSetBudgetLimit({ onSaved }));
  return { save: result.current, onSaved };
}

describe("useSetBudgetLimit", () => {
  beforeEach(() => {
    setBudgetLimitMock.mockReset();
    readSessionTokenMock.mockReset();
    showToastMock.mockReset();
    readSessionTokenMock.mockReturnValue("token");
  });

  it.each([
    { created: true, message: "Dodano limit" },
    { created: false, message: "Zaktualizowano limit" },
  ])(
    "posts with the session token, notifies the view, then shows “$message”",
    async ({ created, message }) => {
      setBudgetLimitMock.mockResolvedValue(resultOf(created));
      const { save, onSaved } = renderSave();

      await save(REQUEST);

      expect(setBudgetLimitMock).toHaveBeenCalledWith("token", REQUEST);
      expect(onSaved).toHaveBeenCalledWith(REQUEST);
      expect(showToastMock).toHaveBeenCalledWith(message);
      const [savedOrder = 0] = onSaved.mock.invocationCallOrder;
      const [toastOrder = 0] = showToastMock.mock.invocationCallOrder;
      expect(savedOrder).toBeGreaterThan(0);
      expect(savedOrder).toBeLessThan(toastOrder);
    },
  );

  it("exports the toast texts", () => {
    expect(LIMIT_CREATED_MESSAGE).toBe("Dodano limit");
    expect(LIMIT_UPDATED_MESSAGE).toBe("Zaktualizowano limit");
  });

  it("rejects without notifying or showing a toast when the request fails", async () => {
    const failure = new ApiError(409, { status: 409, detail: "Konflikt" });
    setBudgetLimitMock.mockRejectedValue(failure);
    const { save, onSaved } = renderSave();

    await expect(save(REQUEST)).rejects.toBe(failure);

    expect(onSaved).not.toHaveBeenCalled();
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it("rejects without a request when there is no session token", async () => {
    readSessionTokenMock.mockReturnValue(undefined);
    const { save, onSaved } = renderSave();

    await expect(save(REQUEST)).rejects.toThrow("Missing session token");

    expect(setBudgetLimitMock).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(showToastMock).not.toHaveBeenCalled();
  });
});
