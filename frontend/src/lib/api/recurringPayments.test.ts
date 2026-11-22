import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRecurringPayment,
  getRecurringPayments,
} from "@/lib/api/recurringPayments";
import { NETFLIX_PAYMENT, TEST_PAYMENTS } from "@/test-utils/recurringPayments";
import type { RecurringPaymentRequest } from "@/types/api";

const BASE_URL = "http://localhost:8080/api/v1";
const fetchMock = vi.fn<typeof fetch>();

describe("recurring payments API", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", BASE_URL);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("gets the payments with the Bearer token and keeps the order of the response", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(TEST_PAYMENTS), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await getRecurringPayments("abc");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/recurring-payments`);
    expect(init?.method).toBe("GET");
    expect(init?.headers).toEqual({
      Accept: "application/json",
      Authorization: "Bearer abc",
    });
    expect(result).toEqual(TEST_PAYMENTS);
  });

  it("posts a new payment with the Bearer token and returns the created payment", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(NETFLIX_PAYMENT), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const request: RecurringPaymentRequest = {
      name: "Netflix",
      amount: 43.5,
      currency: "PLN",
      frequency: "MONTHLY",
      nextDueDate: "2026-12-01",
      categoryId: 2,
    };

    const result = await createRecurringPayment("abc", request);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/recurring-payments`);
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Bearer abc",
    });
    expect(init?.body).toBe(JSON.stringify(request));
    expect(result).toEqual(NETFLIX_PAYMENT);
  });
});
