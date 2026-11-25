import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { suggestCategory } from "@/lib/api/ai";
import { AI_GROCERIES, NO_SUGGESTION } from "@/test-utils/categorySuggestion";

const BASE_URL = "http://localhost:8080/api/v1";
const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("AI API", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", BASE_URL);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("posts the request with the Bearer token and returns the suggestion", async () => {
    fetchMock.mockResolvedValue(jsonResponse(AI_GROCERIES));

    const result = await suggestCategory("abc", {
      description: "Biedronka zakupy",
      amount: 184.5,
      type: "EXPENSE",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/ai/suggest-category`);
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Bearer abc",
    });
    expect(init?.body).toBe(
      JSON.stringify({
        description: "Biedronka zakupy",
        amount: 184.5,
        type: "EXPENSE",
      }),
    );
    expect(result).toEqual(AI_GROCERIES);
  });

  it("returns the answer without a suggestion as it is", async () => {
    fetchMock.mockResolvedValue(jsonResponse(NO_SUGGESTION));

    const result = await suggestCategory("abc", {
      description: "xyz",
      type: "EXPENSE",
    });

    expect(result).toEqual(NO_SUGGESTION);
  });
});
