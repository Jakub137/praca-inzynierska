import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { AuthContext, type AuthStatus } from "@/lib/auth/authContext";
import { makeAuthValue } from "@/test-utils/authContextValue";
import { TEST_SUMMARY } from "@/test-utils/dashboard";
import type { DashboardSummaryResponse } from "@/types/api";

const getDashboardSummaryMock = vi.hoisted(() =>
  vi.fn<(token: string) => Promise<DashboardSummaryResponse>>(),
);
const readSessionTokenMock = vi.hoisted(() =>
  vi.fn<() => string | undefined>(),
);

vi.mock("@/lib/api/dashboard", () => ({
  getDashboardSummary: getDashboardSummaryMock,
}));
vi.mock("@/lib/auth/session", () => ({
  readSessionToken: readSessionTokenMock,
}));

const READY_STATE = { status: "ready", summary: TEST_SUMMARY };

function renderSummaryHook(status: AuthStatus) {
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider value={makeAuthValue({ status })}>
        {children}
      </AuthContext.Provider>
    );
  }
  return renderHook(() => useDashboardSummary(), { wrapper });
}

describe("useDashboardSummary", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    readSessionTokenMock.mockReturnValue("abc");
    getDashboardSummaryMock.mockResolvedValue(TEST_SUMMARY);
  });

  it("goes from loading to ready once, with the summary", async () => {
    const { result } = renderSummaryHook("authenticated");

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state).toEqual(READY_STATE));
    expect(getDashboardSummaryMock).toHaveBeenCalledTimes(1);
    expect(getDashboardSummaryMock).toHaveBeenCalledWith("abc");
  });

  it("reports an error when the request fails", async () => {
    getDashboardSummaryMock.mockRejectedValue(new Error("500"));

    const { result } = renderSummaryHook("authenticated");

    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );
  });

  it("reports an error without calling the API when there is no token", async () => {
    readSessionTokenMock.mockReturnValue(undefined);

    const { result } = renderSummaryHook("authenticated");

    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );
    expect(getDashboardSummaryMock).not.toHaveBeenCalled();
  });

  it("fetches again after retry", async () => {
    getDashboardSummaryMock.mockRejectedValueOnce(new Error("500"));
    const { result } = renderSummaryHook("authenticated");
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );

    act(() => {
      result.current.retry();
    });

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state).toEqual(READY_STATE));
    expect(getDashboardSummaryMock).toHaveBeenCalledTimes(2);
  });

  it.each<AuthStatus>(["loading", "unauthenticated", "error"])(
    "stays idle and does not fetch when the auth status is %s",
    (status) => {
      const { result } = renderSummaryHook(status);

      expect(result.current.state).toEqual({ status: "idle" });
      expect(getDashboardSummaryMock).not.toHaveBeenCalled();
    },
  );
});
