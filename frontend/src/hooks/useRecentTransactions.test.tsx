import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRecentTransactions } from "@/hooks/useRecentTransactions";
import type { TransactionsPageParams } from "@/lib/api/transactions";
import { AuthContext, type AuthStatus } from "@/lib/auth/authContext";
import { makeAuthValue } from "@/test-utils/authContextValue";
import { makePage, TEST_TRANSACTIONS } from "@/test-utils/transactions";
import type { PageResponse, TransactionResponse } from "@/types/api";

const getTransactionsMock = vi.hoisted(() =>
  vi.fn<
    (
      token: string,
      params: TransactionsPageParams,
    ) => Promise<PageResponse<TransactionResponse>>
  >(),
);
const readSessionTokenMock = vi.hoisted(() =>
  vi.fn<() => string | undefined>(),
);

vi.mock("@/lib/api/transactions", () => ({
  getTransactions: getTransactionsMock,
}));
vi.mock("@/lib/auth/session", () => ({
  readSessionToken: readSessionTokenMock,
}));

const PAGE = makePage(TEST_TRANSACTIONS);
const READY_STATE = { status: "ready", page: PAGE };

function renderRecentHook(status: AuthStatus) {
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider value={makeAuthValue({ status })}>
        {children}
      </AuthContext.Provider>
    );
  }
  return renderHook(() => useRecentTransactions(), { wrapper });
}

describe("useRecentTransactions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    readSessionTokenMock.mockReturnValue("abc");
    getTransactionsMock.mockResolvedValue(PAGE);
  });

  it("asks for the first page of five and goes from loading to ready", async () => {
    const { result } = renderRecentHook("authenticated");

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state).toEqual(READY_STATE));
    expect(getTransactionsMock).toHaveBeenCalledTimes(1);
    expect(getTransactionsMock).toHaveBeenCalledWith("abc", {
      page: 0,
      size: 5,
    });
  });

  it("reports an error when the request fails", async () => {
    getTransactionsMock.mockRejectedValue(new Error("500"));

    const { result } = renderRecentHook("authenticated");

    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );
  });

  it("reports an error without calling the API when there is no token", async () => {
    readSessionTokenMock.mockReturnValue(undefined);

    const { result } = renderRecentHook("authenticated");

    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );
    expect(getTransactionsMock).not.toHaveBeenCalled();
  });

  it("fetches again after retry", async () => {
    getTransactionsMock.mockRejectedValueOnce(new Error("500"));
    const { result } = renderRecentHook("authenticated");
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );

    act(() => {
      result.current.retry();
    });

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state).toEqual(READY_STATE));
    expect(getTransactionsMock).toHaveBeenCalledTimes(2);
  });

  it.each<AuthStatus>(["loading", "unauthenticated", "error"])(
    "stays idle and does not fetch when the auth status is %s",
    (status) => {
      const { result } = renderRecentHook(status);

      expect(result.current.state).toEqual({ status: "idle" });
      expect(getTransactionsMock).not.toHaveBeenCalled();
    },
  );
});
