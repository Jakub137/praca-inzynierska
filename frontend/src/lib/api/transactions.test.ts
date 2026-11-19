import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTransactions } from "@/lib/api/transactions";
import { makePage, TEST_TRANSACTIONS } from "@/test-utils/transactions";

const BASE_URL = "http://localhost:8080/api/v1";
const fetchMock = vi.fn<typeof fetch>();

describe("transactions API", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", BASE_URL);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("requests the page with an explicit size and the Bearer token", async () => {
    const body = makePage(TEST_TRANSACTIONS);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await getTransactions("abc", { page: 0, size: 15 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/transactions?page=0&size=15`);
    expect(init?.method).toBe("GET");
    expect(init?.headers).toEqual({
      Accept: "application/json",
      Authorization: "Bearer abc",
    });
    expect(result).toEqual(body);
  });

  it("adds every filter that is set, in a fixed order", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(makePage([])), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await getTransactions("abc", {
      page: 1,
      size: 15,
      categoryId: 3,
      type: "EXPENSE",
      dateFrom: "2026-02-01",
      dateTo: "2026-02-28",
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      `${BASE_URL}/transactions?page=1&size=15&categoryId=3&type=EXPENSE&dateFrom=2026-02-01&dateTo=2026-02-28`,
    );
  });

  it("does not send filters that are not set", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(makePage([])), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await getTransactions("abc", { page: 0, size: 15, type: "INCOME" });

    expect(fetchMock.mock.calls[0][0]).toBe(
      `${BASE_URL}/transactions?page=0&size=15&type=INCOME`,
    );
  });
});
