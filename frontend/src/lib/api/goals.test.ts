import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSavingsGoal,
  depositToSavingsGoal,
  getSavingsGoals,
} from "@/lib/api/goals";
import { ACTIVE_GOAL, TEST_GOALS } from "@/test-utils/goals";
import type { DepositToGoalRequest, SavingsGoalRequest } from "@/types/api";

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

  it("posts a new goal with the Bearer token and returns the created goal", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(ACTIVE_GOAL), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const request: SavingsGoalRequest = {
      name: "Wakacje we Włoszech",
      targetAmount: 6000.5,
      targetDate: "2027-07-21",
    };

    const result = await createSavingsGoal("abc", request);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/savings-goals`);
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Bearer abc",
    });
    expect(init?.body).toBe(JSON.stringify(request));
    expect(result).toEqual(ACTIVE_GOAL);
  });

  it("posts a deposit to the goal address with the Bearer token and returns the goal", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(ACTIVE_GOAL), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const request: DepositToGoalRequest = { amount: 250.5 };

    const result = await depositToSavingsGoal("abc", 7, request);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/savings-goals/7/deposit`);
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Bearer abc",
    });
    expect(init?.body).toBe(JSON.stringify(request));
    expect(result).toEqual(ACTIVE_GOAL);
  });
});
