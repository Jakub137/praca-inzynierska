import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ERROR_STATE,
  type SettledState,
  useAuthenticatedLoad,
} from "@/hooks/useAuthenticatedLoad";
import { AuthContext, type AuthStatus } from "@/lib/auth/authContext";
import { makeAuthValue } from "@/test-utils/authContextValue";

type NumberReady = { readonly status: "ready"; readonly value: number };

const loadMock = vi.hoisted(() =>
  vi.fn<() => Promise<SettledState<NumberReady>>>(),
);

function ready(value: number): NumberReady {
  return { status: "ready", value };
}

function renderLoadHook(status: AuthStatus) {
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider value={makeAuthValue({ status })}>
        {children}
      </AuthContext.Provider>
    );
  }
  return renderHook(
    ({ load }: { load: () => Promise<SettledState<NumberReady>> }) =>
      useAuthenticatedLoad(load),
    { wrapper, initialProps: { load: loadMock } },
  );
}

describe("useAuthenticatedLoad", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    loadMock.mockResolvedValue(ready(1));
  });

  it.each<AuthStatus>(["loading", "unauthenticated", "error"])(
    "stays idle and does not load when the auth status is %s",
    (status) => {
      const { result } = renderLoadHook(status);

      expect(result.current.state).toEqual({ status: "idle" });
      expect(loadMock).not.toHaveBeenCalled();
    },
  );

  it("goes from loading to the ready state of the loader", async () => {
    const { result } = renderLoadHook("authenticated");

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state).toEqual(ready(1)));
    expect(loadMock).toHaveBeenCalledTimes(1);
  });

  it("goes from loading to error when the loader reports one", async () => {
    loadMock.mockResolvedValue(ERROR_STATE);

    const { result } = renderLoadHook("authenticated");

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "error" }),
    );
  });

  it("shows loading after retry and ignores the result of the older attempt", async () => {
    let resolveFirst: (state: SettledState<NumberReady>) => void = () => {};
    loadMock
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
      )
      .mockResolvedValueOnce(ready(2));
    const { result } = renderLoadHook("authenticated");

    act(() => {
      result.current.retry();
    });
    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state).toEqual(ready(2)));
    await act(async () => {
      resolveFirst(ready(1));
    });

    expect(result.current.state).toEqual(ready(2));
    expect(loadMock).toHaveBeenCalledTimes(2);
  });

  it("does not load again when it re-renders, even with a new loader", async () => {
    const { result, rerender } = renderLoadHook("authenticated");
    await waitFor(() => expect(result.current.state).toEqual(ready(1)));
    const otherLoad = vi.fn<() => Promise<SettledState<NumberReady>>>();

    rerender({ load: otherLoad });

    expect(result.current.state).toEqual(ready(1));
    expect(loadMock).toHaveBeenCalledTimes(1);
    expect(otherLoad).not.toHaveBeenCalled();
  });
});
