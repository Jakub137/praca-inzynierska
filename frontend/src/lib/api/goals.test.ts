import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSavingsGoals } from "@/lib/api/goals";
import { TEST_GOALS } from "@/test-utils/goals";

const BASE_URL = "http://localhost:8080/api/v1";
const fetchMock = vi.fn<typeof fetch>();

describe("savings goals API", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", BASE_URL);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("gets the goals with the Bearer token and keeps the order of the response", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(TEST_GOALS), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await getSavingsGoals("abc");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/savings-goals`);
    expect(init?.method).toBe("GET");
    expect(init?.headers).toEqual({
      Accept: "application/json",
      Authorization: "Bearer abc",
    });
    expect(result).toEqual(TEST_GOALS);
  });
});
