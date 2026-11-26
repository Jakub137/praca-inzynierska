import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMonthlyBalance } from "@/lib/api/analytics";
import { TEST_BALANCE } from "@/test-utils/monthlyBalance";

const BASE_URL = "http://localhost:8080/api/v1";
const fetchMock = vi.fn<typeof fetch>();

describe("analytics API", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", BASE_URL);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("gets the monthly balance for the given months with the Bearer token", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(TEST_BALANCE), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await getMonthlyBalance("abc", 12);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/analytics/monthly-balance?months=12`);
    expect(init?.method).toBe("GET");
    expect(init?.headers).toEqual({
      Accept: "application/json",
      Authorization: "Bearer abc",
    });
    expect(result).toEqual(TEST_BALANCE);
  });
});
