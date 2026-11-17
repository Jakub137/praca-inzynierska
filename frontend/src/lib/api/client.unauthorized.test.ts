import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api/client";
import { ApiError, getUserMessage } from "@/lib/api/errors";
import { UNAUTHORIZED_EVENT } from "@/lib/auth/constants";

const BASE_URL = "http://localhost:8080/api/v1";
const INVALID_CREDENTIALS = "Nieprawidłowy adres e-mail lub hasło.";
const fetchMock = vi.fn<typeof fetch>();
const listener = vi.fn();

function problemResponse(status: number, detail: string): Response {
  return new Response(JSON.stringify({ status, detail }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiRequest 401 handling", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", BASE_URL);
    vi.stubGlobal("fetch", fetchMock);
    window.addEventListener(UNAUTHORIZED_EVENT, listener);
  });

  afterEach(() => {
    window.removeEventListener(UNAUTHORIZED_EVENT, listener);
    listener.mockReset();
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("announces a 401 from a protected endpoint and still throws ApiError", async () => {
    fetchMock.mockResolvedValue(problemResponse(401, "Sesja wygasła."));

    await expect(
      apiRequest("/transactions", { token: "abc" }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it.each(["/auth/login", "/auth/register", "/auth/login?source=form"])(
    "does not announce a 401 from %s and keeps the server message",
    async (path) => {
      fetchMock.mockResolvedValue(problemResponse(401, INVALID_CREDENTIALS));

      const error = await apiRequest(path, { method: "POST", body: {} }).catch(
        (caught: unknown) => caught,
      );

      expect(error).toBeInstanceOf(ApiError);
      expect(getUserMessage(error)).toBe(INVALID_CREDENTIALS);
      expect(listener).not.toHaveBeenCalled();
    },
  );

  it.each([403, 404, 500])("does not announce a %i", async (status) => {
    fetchMock.mockResolvedValue(problemResponse(status, "Błąd."));

    await expect(
      apiRequest("/transactions", { token: "abc" }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(listener).not.toHaveBeenCalled();
  });
});
