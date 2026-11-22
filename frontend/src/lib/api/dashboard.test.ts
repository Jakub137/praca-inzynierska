import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDashboardSummary } from "@/lib/api/dashboard";
import {
  SUMMARY_WITHOUT_OPTIONALS,
  TEST_SUMMARY,
} from "@/test-utils/dashboard";

const BASE_URL = "http://localhost:8080/api/v1";
const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("dashboard API", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", BASE_URL);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("gets the summary with the Bearer token", async () => {
    fetchMock.mockResolvedValue(jsonResponse(TEST_SUMMARY));

    const result = await getDashboardSummary("abc");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/dashboard/summary`);
    expect(init?.method).toBe("GET");
    expect(init?.headers).toEqual({
      Accept: "application/json",
      Authorization: "Bearer abc",
    });
    expect(result).toEqual(TEST_SUMMARY);
  });

  it("keeps null in the optional fields instead of turning it into zero", async () => {
    fetchMock.mockResolvedValue(jsonResponse(SUMMARY_WITHOUT_OPTIONALS));

    const result = await getDashboardSummary("abc");

    expect(result.availableFundsChangePercent).toBeNull();
    expect(result.monthLimitTotal).toBeNull();
  });
});
