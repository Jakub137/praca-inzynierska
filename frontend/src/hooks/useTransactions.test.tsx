import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTransactions } from "@/hooks/useTransactions";
import type { TransactionsPageParams } from "@/lib/api/transactions";
import { AuthContext, type AuthStatus } from "@/lib/auth/authContext";
import {
  DEFAULT_TRANSACTION_FILTERS,
  type TransactionFilters,
} from "@/lib/transactions/filters";
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

const TEST_PAGE = makePage(TEST_TRANSACTIONS);

function renderTransactionsHook(
  status: AuthStatus,
  filters: TransactionFilters = DEFAULT_TRANSACTION_FILTERS,
) {
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider value={makeAuthValue({ status })}>
        {children}
      </AuthContext.Provider>
    );
  }
  return renderHook(
    (props: { filters: TransactionFilters }) => useTransactions(props.filters),
    { wrapper, initialProps: { filters } },
  );
}

describe("useTransactions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    readSessionTokenMock.mockReturnValue("abc");
    getTransactionsMock.mockResolvedValue(TEST_PAGE);
  });

  it("goes from loading to ready once, asking for page 0 with size 15", async () => {
    const { result } = renderTransactionsHook("authenticated");

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: "ready",
        page: TEST_PAGE,
      }),
    );
    expect(getTransactionsMock).toHaveBeenCalledTimes(1);
    expect(getTransactionsMock).toHaveBeenCalledWith("abc", {
      page: 0,
      size: 15,
    });
  });

  it("maps the filters to API parameters, counting pages from zero", async () => {
    renderTransactionsHook("authenticated", {
      page: 3,
      month: "2026-02",
      type: "EXPENSE",
      categoryId: 7,
    });

    await waitFor(() => expect(getTransactionsMock).toHaveBeenCalledTimes(1));
    expect(getTransactionsMock).toHaveBeenCalledWith("abc", {
      page: 2,
      size: 15,
      categoryId: 7,
      type: "EXPENSE",
      dateFrom: "2026-02-01",
      dateTo: "2026-02-28",
    });
  });

  it("reports an error when the request fails", async () => {
    getTransactionsMock.mockRejectedValue(new Error("500"));

    const { result } = renderTransactionsHook("authenticated");

    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );
  });

  it("reports an error without calling the API when there is no token", async () => {
    readSessionTokenMock.mockReturnValue(undefined);

    const { result } = renderTransactionsHook("authenticated");

    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );
    expect(getTransactionsMock).not.toHaveBeenCalled();
  });

  it("fetches again after retry", async () => {
    getTransactionsMock.mockRejectedValueOnce(new Error("500"));
    const { result } = renderTransactionsHook("authenticated");
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );

    act(() => {
      result.current.retry();
    });

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: "ready",
        page: TEST_PAGE,
      }),
    );
    expect(getTransactionsMock).toHaveBeenCalledTimes(2);
  });

  it("shows the skeleton and fetches again when the filters change", async () => {
    const { result, rerender } = renderTransactionsHook("authenticated");
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    rerender({ filters: { ...DEFAULT_TRANSACTION_FILTERS, type: "INCOME" } });

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(getTransactionsMock).toHaveBeenCalledTimes(2);
    expect(getTransactionsMock).toHaveBeenLastCalledWith("abc", {
      page: 0,
      size: 15,
      type: "INCOME",
    });
  });

  it("does not fetch again for a new filters object with the same values", async () => {
    const { result, rerender } = renderTransactionsHook("authenticated");
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    rerender({ filters: { ...DEFAULT_TRANSACTION_FILTERS } });

    expect(result.current.state.status).toBe("ready");
    expect(getTransactionsMock).toHaveBeenCalledTimes(1);
  });

  it.each<AuthStatus>(["loading", "unauthenticated", "error"])(
    "stays idle and does not fetch when the auth status is %s",
    (status) => {
      const { result } = renderTransactionsHook(status);

      expect(result.current.state).toEqual({ status: "idle" });
      expect(getTransactionsMock).not.toHaveBeenCalled();
    },
  );
});
