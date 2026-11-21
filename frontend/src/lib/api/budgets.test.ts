import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBudgetUsage, setBudgetLimit } from "@/lib/api/budgets";
import { TEST_BUDGET_USAGE } from "@/test-utils/budgets";
import type { BudgetLimitResponse, SetBudgetLimitRequest } from "@/types/api";

const BASE_URL = "http://localhost:8080/api/v1";
const fetchMock = vi.fn<typeof fetch>();
const REQUEST: SetBudgetLimitRequest = {
  categoryId: 2,
  month: 11,
  year: 2026,
  limitAmount: 1200,
};
const SAVED_LIMIT: BudgetLimitResponse = { id: 7, ...REQUEST };

function respondWithUsage() {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify(TEST_BUDGET_USAGE), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("budgets API", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", BASE_URL);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("asks for the current month without parameters and sends the Bearer token", async () => {
    respondWithUsage();

    const result = await getBudgetUsage("abc");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/budget-limits/usage`);
    expect(init?.method).toBe("GET");
    expect(init?.headers).toEqual({
      Accept: "application/json",
      Authorization: "Bearer abc",
    });
    expect(result).toEqual(TEST_BUDGET_USAGE);
  });

  it("sends month and year together when a period is given", async () => {
    respondWithUsage();

    await getBudgetUsage("abc", { year: 2026, month: 9 });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/budget-limits/usage?month=9&year=2026`);
  });

  it.each([
    { status: 201, created: true },
    { status: 200, created: false },
  ])(
    "posts the limit with the Bearer token and reports created=$created for $status",
    async ({ status, created }) => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify(SAVED_LIMIT), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await setBudgetLimit("abc", REQUEST);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/budget-limits`);
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual({
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer abc",
      });
      expect(init?.body).toBe(JSON.stringify(REQUEST));
      expect(result).toEqual({ limit: SAVED_LIMIT, created });
    },
  );
});
