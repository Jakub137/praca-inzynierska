import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCategoryDistribution } from "@/hooks/useCategoryDistribution";
import type { DateRange } from "@/lib/analytics/distributionRange";
import { AuthContext, type AuthStatus } from "@/lib/auth/authContext";
import { makeAuthValue } from "@/test-utils/authContextValue";
import { TEST_DISTRIBUTION } from "@/test-utils/categoryDistribution";
import type { CategoryDistributionResponse } from "@/types/api";

const getCategoryDistributionMock = vi.hoisted(() =>
  vi.fn<
    (token: string, range: DateRange) => Promise<CategoryDistributionResponse>
  >(),
);
const readSessionTokenMock = vi.hoisted(() =>
  vi.fn<() => string | undefined>(),
);

vi.mock("@/lib/api/analytics", () => ({
  getCategoryDistribution: getCategoryDistributionMock,
}));
vi.mock("@/lib/auth/session", () => ({
  readSessionToken: readSessionTokenMock,
}));

const READY_STATE = { status: "ready", distribution: TEST_DISTRIBUTION };

function renderDistributionHook(status: AuthStatus) {
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider value={makeAuthValue({ status })}>
        {children}
      </AuthContext.Provider>
    );
  }
  return renderHook(({ months }) => useCategoryDistribution(months), {
    wrapper,
    initialProps: { months: 6 },
  });
}

describe("useCategoryDistribution", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Only the date is fake. 23:30 UTC on 30 November is already 1 December in Warsaw.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-30T23:30:00Z"));
    readSessionTokenMock.mockReturnValue("abc");
    getCategoryDistributionMock.mockResolvedValue(TEST_DISTRIBUTION);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("asks for the months counted from today in Warsaw", async () => {
    const { result } = renderDistributionHook("authenticated");

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state).toEqual(READY_STATE));
    expect(getCategoryDistributionMock).toHaveBeenCalledTimes(1);
    expect(getCategoryDistributionMock).toHaveBeenCalledWith("abc", {
      dateFrom: "2026-07-01",
      dateTo: "2026-12-31",
    });
  });

  it("shows loading again and requests the new period", async () => {
    const { result, rerender } = renderDistributionHook("authenticated");
    await waitFor(() => expect(result.current.state).toEqual(READY_STATE));

    rerender({ months: 12 });

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state).toEqual(READY_STATE));
    expect(getCategoryDistributionMock).toHaveBeenLastCalledWith("abc", {
      dateFrom: "2026-01-01",
      dateTo: "2026-12-31",
    });
    expect(getCategoryDistributionMock).toHaveBeenCalledTimes(2);
  });

  it("reports an error when the request fails", async () => {
    getCategoryDistributionMock.mockRejectedValue(new Error("500"));

    const { result } = renderDistributionHook("authenticated");

    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );
  });

  it("reports an error without calling the API when there is no token", async () => {
    readSessionTokenMock.mockReturnValue(undefined);

    const { result } = renderDistributionHook("authenticated");

    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );
    expect(getCategoryDistributionMock).not.toHaveBeenCalled();
  });

  it.each<AuthStatus>(["loading", "unauthenticated", "error"])(
    "stays idle and does not fetch when the auth status is %s",
    (status) => {
      const { result } = renderDistributionHook(status);

      expect(result.current.state).toEqual({ status: "idle" });
      expect(getCategoryDistributionMock).not.toHaveBeenCalled();
    },
  );
});
