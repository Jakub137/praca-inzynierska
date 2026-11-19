import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCategories } from "@/lib/api/categories";
import { TEST_CATEGORIES } from "@/test-utils/categories";

const BASE_URL = "http://localhost:8080/api/v1";
const fetchMock = vi.fn<typeof fetch>();

describe("categories API", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", BASE_URL);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("requests the categories with the Bearer token", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(TEST_CATEGORIES), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await getCategories("abc");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/categories`);
    expect(init?.method).toBe("GET");
    expect(init?.headers).toEqual({
      Accept: "application/json",
      Authorization: "Bearer abc",
    });
    expect(result).toEqual(TEST_CATEGORIES);
  });
});
