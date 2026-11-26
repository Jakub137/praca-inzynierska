import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMonthlyBalance } from "@/hooks/useMonthlyBalance";
import { AuthContext, type AuthStatus } from "@/lib/auth/authContext";
import { makeAuthValue } from "@/test-utils/authContextValue";
import { TEST_BALANCE } from "@/test-utils/monthlyBalance";
import type { MonthlyBalanceResponse } from "@/types/api";

const getMonthlyBalanceMock = vi.hoisted(() =>
  vi.fn<
    (
      token: string,
      months: number,
    ) => Promise<readonly MonthlyBalanceResponse[]>
  >(),
);
const readSessionTokenMock = vi.hoisted(() =>
  vi.fn<() => string | undefined>(),
);

vi.mock("@/lib/api/analytics", () => ({
  getMonthlyBalance: getMonthlyBalanceMock,
}));
vi.mock("@/lib/auth/session", () => ({
  readSessionToken: readSessionTokenMock,
}));

const READY_STATE = { status: "ready", rows: TEST_BALANCE };

function renderBalanceHook(status: AuthStatus) {
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider value={makeAuthValue({ status })}>
        {children}
      </AuthContext.Provider>
    );
  }
  return renderHook(({ months }) => useMonthlyBalance(months), {
    wrapper,
    initialProps: { months: 6 },
  });
}

describe("useMonthlyBalance", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    readSessionTokenMock.mockReturnValue("abc");
    getMonthlyBalanceMock.mockResolvedValue(TEST_BALANCE);
  });

  it("goes from loading to ready with the rows of the chosen period", async () => {
    const { result } = renderBalanceHook("authenticated");

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state).toEqual(READY_STATE));
    expect(getMonthlyBalanceMock).toHaveBeenCalledTimes(1);
    expect(getMonthlyBalanceMock).toHaveBeenCalledWith("abc", 6);
  });

  it("shows loading again and requests the new period", async () => {
    const { result, rerender } = renderBalanceHook("authenticated");
    await waitFor(() => expect(result.current.state).toEqual(READY_STATE));

    rerender({ months: 12 });

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state).toEqual(READY_STATE));
    expect(getMonthlyBalanceMock).toHaveBeenLastCalledWith("abc", 12);
    expect(getMonthlyBalanceMock).toHaveBeenCalledTimes(2);
  });

  it("reports an error when the request fails", async () => {
    getMonthlyBalanceMock.mockRejectedValue(new Error("500"));

    const { result } = renderBalanceHook("authenticated");

    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );
  });

  it("reports an error without calling the API when there is no token", async () => {
    readSessionTokenMock.mockReturnValue(undefined);

    const { result } = renderBalanceHook("authenticated");

    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );
    expect(getMonthlyBalanceMock).not.toHaveBeenCalled();
  });

  it.each<AuthStatus>(["loading", "unauthenticated", "error"])(
    "stays idle and does not fetch when the auth status is %s",
    (status) => {
      const { result } = renderBalanceHook(status);

      expect(result.current.state).toEqual({ status: "idle" });
      expect(getMonthlyBalanceMock).not.toHaveBeenCalled();
    },
  );
});
