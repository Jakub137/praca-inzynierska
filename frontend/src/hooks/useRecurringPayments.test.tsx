import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRecurringPayments } from "@/hooks/useRecurringPayments";
import { AuthContext, type AuthStatus } from "@/lib/auth/authContext";
import { makeAuthValue } from "@/test-utils/authContextValue";
import { TEST_PAYMENTS } from "@/test-utils/recurringPayments";
import type { RecurringPaymentResponse } from "@/types/api";

const getRecurringPaymentsMock = vi.hoisted(() =>
  vi.fn<(token: string) => Promise<readonly RecurringPaymentResponse[]>>(),
);
const readSessionTokenMock = vi.hoisted(() =>
  vi.fn<() => string | undefined>(),
);

vi.mock("@/lib/api/recurringPayments", () => ({
  getRecurringPayments: getRecurringPaymentsMock,
}));
vi.mock("@/lib/auth/session", () => ({
  readSessionToken: readSessionTokenMock,
}));

const READY_STATE = {
  status: "ready",
  payments: TEST_PAYMENTS,
  today: "2026-11-21",
};

function renderPaymentsHook(status: AuthStatus) {
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider value={makeAuthValue({ status })}>
        {children}
      </AuthContext.Provider>
    );
  }
  return renderHook(() => useRecurringPayments(), { wrapper });
}

describe("useRecurringPayments", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Only Date is faked: waitFor keeps using the real timers.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-21T10:00:00Z"));
    readSessionTokenMock.mockReturnValue("abc");
    getRecurringPaymentsMock.mockResolvedValue(TEST_PAYMENTS);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("goes from loading to ready once, with the payments and today's date", async () => {
    const { result } = renderPaymentsHook("authenticated");

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state).toEqual(READY_STATE));
    expect(getRecurringPaymentsMock).toHaveBeenCalledTimes(1);
    expect(getRecurringPaymentsMock).toHaveBeenCalledWith("abc");
  });

  it("reports an error when the request fails", async () => {
    getRecurringPaymentsMock.mockRejectedValue(new Error("500"));

    const { result } = renderPaymentsHook("authenticated");

    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );
  });

  it("reports an error without calling the API when there is no token", async () => {
    readSessionTokenMock.mockReturnValue(undefined);

    const { result } = renderPaymentsHook("authenticated");

    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );
    expect(getRecurringPaymentsMock).not.toHaveBeenCalled();
  });

  it("fetches again after retry", async () => {
    getRecurringPaymentsMock.mockRejectedValueOnce(new Error("500"));
    const { result } = renderPaymentsHook("authenticated");
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );

    act(() => {
      result.current.retry();
    });

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state).toEqual(READY_STATE));
    expect(getRecurringPaymentsMock).toHaveBeenCalledTimes(2);
  });

  it.each<AuthStatus>(["loading", "unauthenticated", "error"])(
    "stays idle and does not fetch when the auth status is %s",
    (status) => {
      const { result } = renderPaymentsHook(status);

      expect(result.current.state).toEqual({ status: "idle" });
      expect(getRecurringPaymentsMock).not.toHaveBeenCalled();
    },
  );
});
