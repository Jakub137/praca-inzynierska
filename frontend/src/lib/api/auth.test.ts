import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser, loginUser, registerUser } from "@/lib/api/auth";

const BASE_URL = "http://localhost:8080/api/v1";
const fetchMock = vi.fn<typeof fetch>();

describe("auth API", () => {
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

  it("posts the login request without an Authorization header", async () => {
    const authResponse = {
      accessToken: "token",
      expiresIn: 86400,
      user: { id: "1", email: "jan@example.com" },
    };
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(authResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const request = { email: "jan@example.com", password: "Haslo123!" };

    const result = await loginUser(request);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/auth/login`);
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(request));
    expect(init?.body).not.toContain("rememberMe");
    expect(init?.headers).toEqual({
      Accept: "application/json",
      "Content-Type": "application/json",
    });
    expect(result).toEqual(authResponse);
  });
  
  it("fetches the current user with the Bearer token", async () => {
    const user = { id: "1", email: "jan@example.com" };
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(user), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await getCurrentUser("abc");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/auth/me`);
    expect(init?.method).toBe("GET");
    expect(init?.headers).toEqual({
      Accept: "application/json",
      Authorization: "Bearer abc",
    });
    expect(result).toEqual(user);
  });
});
