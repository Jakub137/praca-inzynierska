import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@/lib/api/client";
import {
  ApiError,
  getUserMessage,
  NETWORK_ERROR_MESSAGE,
  NetworkError,
  RequestTimeoutError,
} from "@/lib/api/errors";

const BASE_URL = "http://localhost:8080/api/v1";
const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiRequest", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", BASE_URL);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns parsed JSON and sends URL and bearer token", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: "UP" }));

    const result = await apiRequest<{ status: string }>("/health", {
      token: "abc",
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(result).toEqual({ status: "UP" });
    expect(url).toBe(`${BASE_URL}/health`);
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer abc",
    );
  });

  it("throws ApiError with ProblemDetail on error status", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ status: 404, title: "Nie znaleziono" }, 404),
    );

    const error = await apiRequest("/x").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
    expect((error as ApiError).problem?.title).toBe("Nie znaleziono");
  });

  it("throws ApiError without problem when body is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("oops", { status: 502 }));

    const error = await apiRequest("/x").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).problem).toBeUndefined();
  });

  it("throws NetworkError when the backend is unreachable", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const error = await apiRequest("/x").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NetworkError);
    expect(getUserMessage(error)).toBe(NETWORK_ERROR_MESSAGE);
  });

  it("throws RequestTimeoutError when the timeout signal fires", async () => {
    fetchMock.mockRejectedValue(new DOMException("timeout", "TimeoutError"));

    await expect(apiRequest("/x")).rejects.toBeInstanceOf(RequestTimeoutError);
  });
});
