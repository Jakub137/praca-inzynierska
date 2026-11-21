import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSavingsGoals } from "@/hooks/useSavingsGoals";
import { AuthContext, type AuthStatus } from "@/lib/auth/authContext";
import { makeAuthValue } from "@/test-utils/authContextValue";
import { TEST_GOALS } from "@/test-utils/goals";
import type { SavingsGoalResponse } from "@/types/api";

const getSavingsGoalsMock = vi.hoisted(() =>
  vi.fn<(token: string) => Promise<readonly SavingsGoalResponse[]>>(),
);
const readSessionTokenMock = vi.hoisted(() =>
  vi.fn<() => string | undefined>(),
);

vi.mock("@/lib/api/goals", () => ({
  getSavingsGoals: getSavingsGoalsMock,
}));
vi.mock("@/lib/auth/session", () => ({
  readSessionToken: readSessionTokenMock,
}));

const READY_STATE = {
  status: "ready",
  goals: TEST_GOALS,
  today: "2026-11-21",
};

function renderSavingsGoalsHook(status: AuthStatus) {
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider value={makeAuthValue({ status })}>
        {children}
      </AuthContext.Provider>
    );
  }
  return renderHook(() => useSavingsGoals(), { wrapper });
}

describe("useSavingsGoals", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Only Date is faked: waitFor keeps using the real timers.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-21T10:00:00Z"));
    readSessionTokenMock.mockReturnValue("abc");
    getSavingsGoalsMock.mockResolvedValue(TEST_GOALS);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("goes from loading to ready once, with the goals and today's date", async () => {
    const { result } = renderSavingsGoalsHook("authenticated");

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state).toEqual(READY_STATE));
    expect(getSavingsGoalsMock).toHaveBeenCalledTimes(1);
    expect(getSavingsGoalsMock).toHaveBeenCalledWith("abc");
  });

  it("reports an error when the request fails", async () => {
    getSavingsGoalsMock.mockRejectedValue(new Error("500"));

    const { result } = renderSavingsGoalsHook("authenticated");

    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );
  });

  it("reports an error without calling the API when there is no token", async () => {
    readSessionTokenMock.mockReturnValue(undefined);

    const { result } = renderSavingsGoalsHook("authenticated");

    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );
    expect(getSavingsGoalsMock).not.toHaveBeenCalled();
  });

  it("fetches again after retry", async () => {
    getSavingsGoalsMock.mockRejectedValueOnce(new Error("500"));
    const { result } = renderSavingsGoalsHook("authenticated");
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );

    act(() => {
      result.current.retry();
    });

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state).toEqual(READY_STATE));
    expect(getSavingsGoalsMock).toHaveBeenCalledTimes(2);
  });

  it.each<AuthStatus>(["loading", "unauthenticated", "error"])(
    "stays idle and does not fetch when the auth status is %s",
    (status) => {
      const { result } = renderSavingsGoalsHook(status);

      expect(result.current.state).toEqual({ status: "idle" });
      expect(getSavingsGoalsMock).not.toHaveBeenCalled();
    },
  );
});
