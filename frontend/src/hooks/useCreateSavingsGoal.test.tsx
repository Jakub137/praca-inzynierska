import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GOAL_CREATED_MESSAGE,
  useCreateSavingsGoal,
} from "@/hooks/useCreateSavingsGoal";
import { ApiError } from "@/lib/api/errors";
import { ACTIVE_GOAL } from "@/test-utils/goals";
import type { SavingsGoalRequest, SavingsGoalResponse } from "@/types/api";

const createSavingsGoalMock = vi.hoisted(() =>
  vi.fn<
    (token: string, request: SavingsGoalRequest) => Promise<SavingsGoalResponse>
  >(),
);
const readSessionTokenMock = vi.hoisted(() =>
  vi.fn<() => string | undefined>(),
);
const showToastMock = vi.hoisted(() => vi.fn<(message: string) => void>());

vi.mock("@/lib/api/goals", () => ({
  createSavingsGoal: createSavingsGoalMock,
}));
vi.mock("@/lib/auth/session", () => ({
  readSessionToken: readSessionTokenMock,
}));
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

const REQUEST: SavingsGoalRequest = {
  name: "Wakacje we Włoszech",
  targetAmount: 6000,
  targetDate: "2027-07-21",
};

function renderSave() {
  const onSaved = vi.fn();
  const { result } = renderHook(() => useCreateSavingsGoal({ onSaved }));
  return { save: result.current, onSaved };
}

describe("useCreateSavingsGoal", () => {
  beforeEach(() => {
    createSavingsGoalMock.mockReset();
    readSessionTokenMock.mockReset();
    showToastMock.mockReset();
    readSessionTokenMock.mockReturnValue("token");
  });

  it("posts with the session token, notifies the view, then shows the toast", async () => {
    createSavingsGoalMock.mockResolvedValue(ACTIVE_GOAL);
    const { save, onSaved } = renderSave();

    await save(REQUEST);

    expect(createSavingsGoalMock).toHaveBeenCalledWith("token", REQUEST);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledWith("Dodano cel");
    const [savedOrder = 0] = onSaved.mock.invocationCallOrder;
    const [toastOrder = 0] = showToastMock.mock.invocationCallOrder;
    expect(savedOrder).toBeGreaterThan(0);
    expect(savedOrder).toBeLessThan(toastOrder);
  });

  it("exports the toast text", () => {
    expect(GOAL_CREATED_MESSAGE).toBe("Dodano cel");
  });

  it("rejects without notifying or showing a toast when the request fails", async () => {
    const failure = new ApiError(400, { status: 400 });
    createSavingsGoalMock.mockRejectedValue(failure);
    const { save, onSaved } = renderSave();

    await expect(save(REQUEST)).rejects.toBe(failure);

    expect(onSaved).not.toHaveBeenCalled();
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it("rejects without a request when there is no session token", async () => {
    readSessionTokenMock.mockReturnValue(undefined);
    const { save, onSaved } = renderSave();

    await expect(save(REQUEST)).rejects.toThrow("Missing session token");

    expect(createSavingsGoalMock).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(showToastMock).not.toHaveBeenCalled();
  });
});
