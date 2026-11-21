import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GOAL_DEPOSITED_MESSAGE,
  useDepositToGoal,
} from "@/hooks/useDepositToGoal";
import { ApiError } from "@/lib/api/errors";
import { ACTIVE_GOAL } from "@/test-utils/goals";
import type { DepositToGoalRequest, SavingsGoalResponse } from "@/types/api";

const depositToSavingsGoalMock = vi.hoisted(() =>
  vi.fn<
    (
      token: string,
      goalId: number,
      request: DepositToGoalRequest,
    ) => Promise<SavingsGoalResponse>
  >(),
);
const readSessionTokenMock = vi.hoisted(() =>
  vi.fn<() => string | undefined>(),
);
const showToastMock = vi.hoisted(() => vi.fn<(message: string) => void>());

vi.mock("@/lib/api/goals", () => ({
  depositToSavingsGoal: depositToSavingsGoalMock,
}));
vi.mock("@/lib/auth/session", () => ({
  readSessionToken: readSessionTokenMock,
}));
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

const REQUEST: DepositToGoalRequest = { amount: 250.5 };

function renderDeposit() {
  const onSaved = vi.fn();
  const { result } = renderHook(() => useDepositToGoal({ onSaved }));
  return { deposit: result.current, onSaved };
}

describe("useDepositToGoal", () => {
  beforeEach(() => {
    depositToSavingsGoalMock.mockReset();
    readSessionTokenMock.mockReset();
    showToastMock.mockReset();
    readSessionTokenMock.mockReturnValue("token");
  });

  it("posts to the goal with the session token, notifies the view with its id, then shows the toast", async () => {
    depositToSavingsGoalMock.mockResolvedValue(ACTIVE_GOAL);
    const { deposit, onSaved } = renderDeposit();

    await deposit(7, REQUEST);

    expect(depositToSavingsGoalMock).toHaveBeenCalledWith("token", 7, REQUEST);
    expect(onSaved).toHaveBeenCalledWith(7);
    expect(showToastMock).toHaveBeenCalledWith("Wpłacono na cel");
    const [savedOrder = 0] = onSaved.mock.invocationCallOrder;
    const [toastOrder = 0] = showToastMock.mock.invocationCallOrder;
    expect(savedOrder).toBeGreaterThan(0);
    expect(savedOrder).toBeLessThan(toastOrder);
  });

  it("exports the toast text", () => {
    expect(GOAL_DEPOSITED_MESSAGE).toBe("Wpłacono na cel");
  });

  it("rejects without notifying or showing a toast when the request fails", async () => {
    const failure = new ApiError(404, { status: 404, detail: "Nie ma celu." });
    depositToSavingsGoalMock.mockRejectedValue(failure);
    const { deposit, onSaved } = renderDeposit();

    await expect(deposit(7, REQUEST)).rejects.toBe(failure);

    expect(onSaved).not.toHaveBeenCalled();
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it("rejects without a request when there is no session token", async () => {
    readSessionTokenMock.mockReturnValue(undefined);
    const { deposit, onSaved } = renderDeposit();

    await expect(deposit(7, REQUEST)).rejects.toThrow("Missing session token");

    expect(depositToSavingsGoalMock).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(showToastMock).not.toHaveBeenCalled();
  });
});
