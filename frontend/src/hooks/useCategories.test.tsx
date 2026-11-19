import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCategories } from "@/hooks/useCategories";
import { AuthContext, type AuthStatus } from "@/lib/auth/authContext";
import { makeAuthValue } from "@/test-utils/authContextValue";
import { TEST_CATEGORIES } from "@/test-utils/categories";
import type { CategoryResponse } from "@/types/api";

const getCategoriesMock = vi.hoisted(() =>
  vi.fn<(token: string) => Promise<readonly CategoryResponse[]>>(),
);
const readSessionTokenMock = vi.hoisted(() =>
  vi.fn<() => string | undefined>(),
);

vi.mock("@/lib/api/categories", () => ({
  getCategories: getCategoriesMock,
}));
vi.mock("@/lib/auth/session", () => ({
  readSessionToken: readSessionTokenMock,
}));

function renderCategoriesHook(status: AuthStatus) {
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider value={makeAuthValue({ status })}>
        {children}
      </AuthContext.Provider>
    );
  }
  return renderHook(() => useCategories(), { wrapper });
}

describe("useCategories", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    readSessionTokenMock.mockReturnValue("abc");
    getCategoriesMock.mockResolvedValue(TEST_CATEGORIES);
  });

  it("goes from loading to ready once, using the session token", async () => {
    const { result } = renderCategoriesHook("authenticated");

    expect(result.current).toEqual({ status: "loading" });
    await waitFor(() =>
      expect(result.current).toEqual({
        status: "ready",
        categories: TEST_CATEGORIES,
      }),
    );
    expect(getCategoriesMock).toHaveBeenCalledTimes(1);
    expect(getCategoriesMock).toHaveBeenCalledWith("abc");
  });

  it("reports an error when the request fails", async () => {
    getCategoriesMock.mockRejectedValue(new Error("500"));

    const { result } = renderCategoriesHook("authenticated");

    await waitFor(() => expect(result.current).toEqual({ status: "error" }));
  });

  it("reports an error without calling the API when there is no token", async () => {
    readSessionTokenMock.mockReturnValue(undefined);

    const { result } = renderCategoriesHook("authenticated");

    await waitFor(() => expect(result.current).toEqual({ status: "error" }));
    expect(getCategoriesMock).not.toHaveBeenCalled();
  });

  it.each<AuthStatus>(["loading", "unauthenticated", "error"])(
    "stays idle and does not fetch when the auth status is %s",
    (status) => {
      const { result } = renderCategoriesHook(status);

      expect(result.current).toEqual({ status: "idle" });
      expect(getCategoriesMock).not.toHaveBeenCalled();
    },
  );
});
