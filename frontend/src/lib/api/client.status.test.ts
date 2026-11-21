import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest, apiRequestWithStatus } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

const BASE_URL = "http://localhost:8080/api/v1";
const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiRequestWithStatus", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", BASE_URL);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each([200, 201])(
    "returns the status %i together with the parsed body",
    async (status) => {
      fetchMock.mockResolvedValue(jsonResponse(status, { id: 1 }));

      const result = await apiRequestWithStatus("/budget-limits", {
        method: "POST",
        body: {},
        token: "abc",
      });

      expect(result).toEqual({ status, data: { id: 1 } });
    },
  );

  it("returns undefined data for 204", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    const result = await apiRequestWithStatus("/transactions/1", {
      method: "DELETE",
      token: "abc",
    });

    expect(result).toEqual({ status: 204, data: undefined });
  });

  it("throws ApiError with the problem for an error status", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(409, { status: 409, detail: "Konflikt" }),
    );

    await expect(
      apiRequestWithStatus("/budget-limits", { method: "POST", body: {} }),
    ).rejects.toMatchObject(
      new ApiError(409, { status: 409, detail: "Konflikt" }),
    );
  });

  it("keeps apiRequest returning only the body", async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { id: 5 }));

    await expect(apiRequest("/budget-limits")).resolves.toEqual({ id: 5 });
  });
});
