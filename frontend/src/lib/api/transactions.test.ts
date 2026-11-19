import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import {
  createTransaction,
  deleteTransaction,
  getTransactions,
} from "@/lib/api/transactions";
import {
  EXPENSE_PLN,
  makePage,
  TEST_TRANSACTIONS,
} from "@/test-utils/transactions";
import type { CreateTransactionRequest } from "@/types/api";

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

  describe("createTransaction", () => {
    const request: CreateTransactionRequest = {
      amount: 184.5,
      currency: "PLN",
      categoryId: 1,
      date: "2026-11-19",
      description: "Zakupy w Biedronce",
      type: "EXPENSE",
    };

    it("posts the request as JSON with the Bearer token and returns the saved transaction", async () => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify(EXPENSE_PLN), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await createTransaction("abc", request);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/transactions`);
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual({
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer abc",
      });
      expect(init?.body).toBe(JSON.stringify(request));
      expect(result).toEqual(EXPENSE_PLN);
    });

    it("rejects with an ApiError that carries the problem detail", async () => {
      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 503,
            detail: "Nie udało się pobrać kursu waluty.",
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/problem+json" },
          },
        ),
      );

      const error: unknown = await createTransaction("abc", request).catch(
        (rejection: unknown) => rejection,
      );

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 503,
        problem: { detail: "Nie udało się pobrać kursu waluty." },
      });
    });
  });

  describe("deleteTransaction", () => {
    it("sends DELETE to the transaction address with the Bearer token and resolves without a body", async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

      const result = await deleteTransaction("abc", EXPENSE_PLN.id);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/transactions/${EXPENSE_PLN.id}`);
      expect(init?.method).toBe("DELETE");
      expect(init?.headers).toEqual({
        Accept: "application/json",
        Authorization: "Bearer abc",
      });
      expect(init?.body).toBeUndefined();
      expect(result).toBeUndefined();
    });

    it("rejects with an ApiError that carries the detail when the transaction is not found", async () => {
      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 404,
            detail: "Nie znaleziono zasobu.",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/problem+json" },
          },
        ),
      );

      const error: unknown = await deleteTransaction(
        "abc",
        EXPENSE_PLN.id,
      ).catch((rejection: unknown) => rejection);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 404,
        problem: { detail: "Nie znaleziono zasobu." },
      });
    });
  });
});
