import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerUser } from "@/lib/api/auth";

const BASE_URL = "http://localhost:8080/api/v1";
const fetchMock = vi.fn<typeof fetch>();

describe("registerUser", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", BASE_URL);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("posts the command as JSON without an Authorization header", async () => {
    const user = { id: "1", email: "jan@example.com" };
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(user), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const request = {
      firstName: "Jan",
      lastName: "Kowalski",
      email: "jan@example.com",
      password: "Haslo123!",
    };

    const result = await registerUser(request);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/auth/register`);
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(request));
    expect(init?.headers).toEqual({
      Accept: "application/json",
      "Content-Type": "application/json",
    });
    expect(result).toEqual(user);
  });
});
