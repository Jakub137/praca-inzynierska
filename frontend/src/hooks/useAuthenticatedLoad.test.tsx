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

type LoadHookProps = {
  load: () => Promise<SettledState<NumberReady>>;
  requestKey?: string;
};

function renderLoadHook(status: AuthStatus, requestKey?: string) {
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider value={makeAuthValue({ status })}>
        {children}
      </AuthContext.Provider>
    );
  }
  // Typed, so rerender() also accepts props without requestKey.
  const initialProps: LoadHookProps = { load: loadMock, requestKey };
  return renderHook(
    ({ load, requestKey: key }: LoadHookProps) =>
      useAuthenticatedLoad(load, key),
    { wrapper, initialProps },
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

  it("shows loading and loads again when the request key changes", async () => {
    loadMock.mockResolvedValueOnce(ready(1)).mockResolvedValueOnce(ready(2));
    const { result, rerender } = renderLoadHook("authenticated", "a");
    await waitFor(() => expect(result.current.state).toEqual(ready(1)));

    rerender({ load: loadMock, requestKey: "b" });

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state).toEqual(ready(2)));
    expect(loadMock).toHaveBeenCalledTimes(2);
  });

  it("starts the new request with the load of the render that changed the key", async () => {
    const { result, rerender } = renderLoadHook("authenticated", "a");
    await waitFor(() => expect(result.current.state).toEqual(ready(1)));
    const keyedLoad = vi
      .fn<() => Promise<SettledState<NumberReady>>>()
      .mockResolvedValue(ready(7));

    rerender({ load: keyedLoad, requestKey: "b" });

    await waitFor(() => expect(result.current.state).toEqual(ready(7)));
    expect(keyedLoad).toHaveBeenCalledTimes(1);
    expect(loadMock).toHaveBeenCalledTimes(1);
  });

  it("ignores the late result of an older request key", async () => {
    let resolveFirst: (state: SettledState<NumberReady>) => void = () => {};
    loadMock
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
      )
      .mockResolvedValueOnce(ready(2));
    const { result, rerender } = renderLoadHook("authenticated", "a");

    rerender({ load: loadMock, requestKey: "b" });
    await waitFor(() => expect(result.current.state).toEqual(ready(2)));
    await act(async () => {
      resolveFirst(ready(1));
    });

    expect(result.current.state).toEqual(ready(2));
    expect(loadMock).toHaveBeenCalledTimes(2);
  });
});
