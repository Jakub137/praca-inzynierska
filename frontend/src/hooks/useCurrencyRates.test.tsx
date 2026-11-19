import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCurrencyRates } from "@/hooks/useCurrencyRates";
import { AuthContext, type AuthStatus } from "@/lib/auth/authContext";
import { makeAuthValue } from "@/test-utils/authContextValue";
import { TEST_RATES } from "@/test-utils/currencyRates";
import type { CurrencyRatesResponse } from "@/types/api";

const getCurrencyRatesMock = vi.hoisted(() =>
  vi.fn<(token: string) => Promise<CurrencyRatesResponse>>(),
);
const readSessionTokenMock = vi.hoisted(() =>
  vi.fn<() => string | undefined>(),
);

vi.mock("@/lib/api/currency", () => ({
  getCurrencyRates: getCurrencyRatesMock,
}));
vi.mock("@/lib/auth/session", () => ({
  readSessionToken: readSessionTokenMock,
}));

function renderRatesHook(status: AuthStatus) {
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider value={makeAuthValue({ status })}>
        {children}
      </AuthContext.Provider>
    );
  }
  return renderHook(() => useCurrencyRates(), { wrapper });
}

describe("useCurrencyRates", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    readSessionTokenMock.mockReturnValue("abc");
    getCurrencyRatesMock.mockResolvedValue({ rates: TEST_RATES });
  });

  it("goes from loading to ready once, using the session token", async () => {
    const { result } = renderRatesHook("authenticated");

    expect(result.current).toEqual({ status: "loading" });
    await waitFor(() =>
      expect(result.current).toEqual({ status: "ready", rates: TEST_RATES }),
    );
    expect(getCurrencyRatesMock).toHaveBeenCalledTimes(1);
    expect(getCurrencyRatesMock).toHaveBeenCalledWith("abc");
  });

  it("reports an error when the request fails", async () => {
    getCurrencyRatesMock.mockRejectedValue(new Error("503"));

    const { result } = renderRatesHook("authenticated");

    await waitFor(() => expect(result.current).toEqual({ status: "error" }));
  });

  it("reports an error when the list is empty", async () => {
    getCurrencyRatesMock.mockResolvedValue({ rates: [] });

    const { result } = renderRatesHook("authenticated");

    await waitFor(() => expect(result.current).toEqual({ status: "error" }));
  });

  it("reports an error without calling the API when there is no token", async () => {
    readSessionTokenMock.mockReturnValue(undefined);

    const { result } = renderRatesHook("authenticated");

    await waitFor(() => expect(result.current).toEqual({ status: "error" }));
    expect(getCurrencyRatesMock).not.toHaveBeenCalled();
  });

  it.each<AuthStatus>(["loading", "unauthenticated", "error"])(
    "stays idle and does not fetch when the auth status is %s",
    (status) => {
      const { result } = renderRatesHook(status);

      expect(result.current).toEqual({ status: "idle" });
      expect(getCurrencyRatesMock).not.toHaveBeenCalled();
    },
  );
});
