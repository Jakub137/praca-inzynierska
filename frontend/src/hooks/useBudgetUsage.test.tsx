import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBudgetUsage } from "@/hooks/useBudgetUsage";
import type { BudgetUsageParams } from "@/lib/api/budgets";
import { AuthContext, type AuthStatus } from "@/lib/auth/authContext";
import { makeAuthValue } from "@/test-utils/authContextValue";
import { TEST_BUDGET_USAGE } from "@/test-utils/budgets";
import type { BudgetUsageResponse } from "@/types/api";

const getBudgetUsageMock = vi.hoisted(() =>
  vi.fn<
    (
      token: string,
      params?: BudgetUsageParams,
    ) => Promise<readonly BudgetUsageResponse[]>
  >(),
);
const readSessionTokenMock = vi.hoisted(() =>
  vi.fn<() => string | undefined>(),
);

vi.mock("@/lib/api/budgets", () => ({
  getBudgetUsage: getBudgetUsageMock,
}));
vi.mock("@/lib/auth/session", () => ({
  readSessionToken: readSessionTokenMock,
}));

const READY_STATE = { status: "ready", usage: TEST_BUDGET_USAGE };

function renderBudgetUsageHook(
  status: AuthStatus,
  month: string | null = null,
) {
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider value={makeAuthValue({ status })}>
        {children}
      </AuthContext.Provider>
    );
  }
  return renderHook(
    (props: { month: string | null }) => useBudgetUsage(props.month),
    { wrapper, initialProps: { month } },
  );
}

describe("useBudgetUsage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    readSessionTokenMock.mockReturnValue("abc");
    getBudgetUsageMock.mockResolvedValue(TEST_BUDGET_USAGE);
  });

  it("goes from loading to ready once, asking for the current month without parameters", async () => {
    const { result } = renderBudgetUsageHook("authenticated");

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state).toEqual(READY_STATE));
    expect(getBudgetUsageMock).toHaveBeenCalledTimes(1);
    expect(getBudgetUsageMock).toHaveBeenCalledWith("abc", undefined);
  });

  it("sends the year and the month of a chosen period", async () => {
    renderBudgetUsageHook("authenticated", "2026-02");

    await waitFor(() => expect(getBudgetUsageMock).toHaveBeenCalledTimes(1));
    expect(getBudgetUsageMock).toHaveBeenCalledWith("abc", {
      year: 2026,
      month: 2,
    });
  });

  it("reports an error when the request fails", async () => {
    getBudgetUsageMock.mockRejectedValue(new Error("500"));

    const { result } = renderBudgetUsageHook("authenticated");

    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );
  });

  it("reports an error without calling the API when there is no token", async () => {
    readSessionTokenMock.mockReturnValue(undefined);

    const { result } = renderBudgetUsageHook("authenticated");

    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );
    expect(getBudgetUsageMock).not.toHaveBeenCalled();
  });

  it("fetches again after retry", async () => {
    getBudgetUsageMock.mockRejectedValueOnce(new Error("500"));
    const { result } = renderBudgetUsageHook("authenticated");
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );

    act(() => {
      result.current.retry();
    });

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state).toEqual(READY_STATE));
    expect(getBudgetUsageMock).toHaveBeenCalledTimes(2);
  });

  it("shows the loading state and fetches again when the month changes", async () => {
    const { result, rerender } = renderBudgetUsageHook("authenticated");
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    rerender({ month: "2026-10" });

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(getBudgetUsageMock).toHaveBeenCalledTimes(2);
    expect(getBudgetUsageMock).toHaveBeenLastCalledWith("abc", {
      year: 2026,
      month: 10,
    });
  });

  it("does not fetch again for a rerender with the same month", async () => {
    const { result, rerender } = renderBudgetUsageHook("authenticated");
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    rerender({ month: null });

    expect(result.current.state.status).toBe("ready");
    expect(getBudgetUsageMock).toHaveBeenCalledTimes(1);
  });

  it.each<AuthStatus>(["loading", "unauthenticated", "error"])(
    "stays idle and does not fetch when the auth status is %s",
    (status) => {
      const { result } = renderBudgetUsageHook(status);

      expect(result.current.state).toEqual({ status: "idle" });
      expect(getBudgetUsageMock).not.toHaveBeenCalled();
    },
  );
});
