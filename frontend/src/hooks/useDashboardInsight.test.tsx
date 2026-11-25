import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardInsight } from "@/hooks/useDashboardInsight";
import { AuthContext, type AuthStatus } from "@/lib/auth/authContext";
import { makeAuthValue } from "@/test-utils/authContextValue";
import {
  NO_INSIGHT_RESPONSE,
  TEST_INSIGHT_MESSAGE,
  TEST_INSIGHT_RESPONSE,
} from "@/test-utils/dashboardInsight";
import type { DashboardInsightResponse } from "@/types/api";

const getDashboardInsightMock = vi.hoisted(() =>
  vi.fn<(token: string) => Promise<DashboardInsightResponse>>(),
);
const readSessionTokenMock = vi.hoisted(() =>
  vi.fn<() => string | undefined>(),
);

vi.mock("@/lib/api/ai", () => ({
  getDashboardInsight: getDashboardInsightMock,
}));
vi.mock("@/lib/auth/session", () => ({
  readSessionToken: readSessionTokenMock,
}));

const READY_STATE = {
  status: "ready",
  insight: {
    categoryId: 2,
    categoryName: "Rozrywka",
    message: TEST_INSIGHT_MESSAGE,
  },
};
const NO_INSIGHT_STATE = { status: "ready", insight: null };

function renderInsightHook(status: AuthStatus) {
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider value={makeAuthValue({ status })}>
        {children}
      </AuthContext.Provider>
    );
  }
  return renderHook(() => useDashboardInsight(), { wrapper });
}

describe("useDashboardInsight", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    readSessionTokenMock.mockReturnValue("abc");
    getDashboardInsightMock.mockResolvedValue(TEST_INSIGHT_RESPONSE);
  });

  it("goes from loading to ready once, with the insight", async () => {
    const { result } = renderInsightHook("authenticated");

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state).toEqual(READY_STATE));
    expect(getDashboardInsightMock).toHaveBeenCalledTimes(1);
    expect(getDashboardInsightMock).toHaveBeenCalledWith("abc");
  });

  it("is ready without an insight when there is no anomaly", async () => {
    getDashboardInsightMock.mockResolvedValue(NO_INSIGHT_RESPONSE);

    const { result } = renderInsightHook("authenticated");

    await waitFor(() => expect(result.current.state).toEqual(NO_INSIGHT_STATE));
  });

  it("treats a partly filled answer as no insight", async () => {
    getDashboardInsightMock.mockResolvedValue({
      ...TEST_INSIGHT_RESPONSE,
      message: null,
    });

    const { result } = renderInsightHook("authenticated");

    await waitFor(() => expect(result.current.state).toEqual(NO_INSIGHT_STATE));
  });

  it("reports an error when the request fails", async () => {
    getDashboardInsightMock.mockRejectedValue(new Error("500"));

    const { result } = renderInsightHook("authenticated");

    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );
  });

  it("reports an error without calling the API when there is no token", async () => {
    readSessionTokenMock.mockReturnValue(undefined);

    const { result } = renderInsightHook("authenticated");

    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );
    expect(getDashboardInsightMock).not.toHaveBeenCalled();
  });

  it("fetches again after retry", async () => {
    getDashboardInsightMock.mockRejectedValueOnce(new Error("500"));
    const { result } = renderInsightHook("authenticated");
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );

    act(() => {
      result.current.retry();
    });

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state).toEqual(READY_STATE));
    expect(getDashboardInsightMock).toHaveBeenCalledTimes(2);
  });

  it.each<AuthStatus>(["loading", "unauthenticated", "error"])(
    "stays idle and does not fetch when the auth status is %s",
    (status) => {
      const { result } = renderInsightHook(status);

      expect(result.current.state).toEqual({ status: "idle" });
      expect(getDashboardInsightMock).not.toHaveBeenCalled();
    },
  );
});
