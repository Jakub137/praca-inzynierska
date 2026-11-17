import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { useAuth } from "@/hooks/useAuth";
import { endSession, readSessionToken, startSession } from "@/lib/auth/session";
import { makeToken } from "@/test-utils/makeToken";
import type { AuthResponse, AuthUserResponse } from "@/types/api";

const { routerMock } = vi.hoisted(() => ({ routerMock: { replace: vi.fn() } }));

vi.mock("next/navigation", () => ({ useRouter: () => routerMock }));

const BASE_URL = "http://localhost:8080/api/v1";
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const MILLISECONDS_PER_SECOND = 1000;
const fetchMock = vi.fn<typeof fetch>();
const USER: AuthUserResponse = {
  id: "1",
  email: "jan@example.com",
  firstName: "Jan",
  lastName: "Kowalski",
  defaultCurrency: "PLN",
};

function nowSeconds(): number {
  return Math.floor(Date.now() / MILLISECONDS_PER_SECOND);
}

function authResponse(token: string): AuthResponse {
  return { accessToken: token, expiresIn: SECONDS_PER_HOUR, user: USER };
}

function storeToken(token: string) {
  startSession(authResponse(token), true);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function Probe() {
  const { status, user, logout, retry } = useAuth();
  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="email">{user?.email ?? ""}</p>
      <button type="button" onClick={logout}>
        Wyloguj
      </button>
      <button type="button" onClick={retry}>
        Spróbuj ponownie
      </button>
    </div>
  );
}

function renderProvider() {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

function status(): string | null {
  return screen.getByTestId("status").textContent;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", BASE_URL);
    vi.stubGlobal("fetch", fetchMock);
    routerMock.replace.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    endSession();
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("becomes unauthenticated without a cookie and does not call the API", async () => {
    renderProvider();

    await waitFor(() => expect(status()).toBe("unauthenticated"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("restores the user from GET /auth/me when a valid cookie exists", async () => {
    const token = makeToken(nowSeconds() + SECONDS_PER_HOUR);
    storeToken(token);
    fetchMock.mockResolvedValue(
      jsonResponse({ ...USER, createdAt: "2026-11-01T10:00:00Z" }),
    );

    renderProvider();

    await waitFor(() => expect(status()).toBe("authenticated"));
    expect(screen.getByTestId("email").textContent).toBe(USER.email);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/auth/me`);
    expect(init?.headers).toEqual({
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    });
  });

  it("removes the cookie and redirects to /login when /auth/me answers 401", async () => {
    storeToken(makeToken(nowSeconds() + SECONDS_PER_HOUR));
    fetchMock.mockResolvedValue(
      jsonResponse({ status: 401, detail: "Sesja wygasła." }, 401),
    );

    renderProvider();

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith("/login"),
    );
    expect(readSessionToken()).toBeUndefined();
    expect(status()).toBe("unauthenticated");
  });

  it("clears an expired cookie without calling the API", async () => {
    storeToken(makeToken(nowSeconds() - SECONDS_PER_MINUTE));

    renderProvider();

    await waitFor(() => expect(status()).toBe("unauthenticated"));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(readSessionToken()).toBeUndefined();
  });

  it("treats a malformed cookie as no session without throwing", async () => {
    storeToken("abc");

    renderProvider();

    await waitFor(() => expect(status()).toBe("unauthenticated"));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(readSessionToken()).toBeUndefined();
  });

  it("reports an error, keeps the cookie and does not redirect when the API is unreachable", async () => {
    const token = makeToken(nowSeconds() + SECONDS_PER_HOUR);
    storeToken(token);
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    renderProvider();

    await waitFor(() => expect(status()).toBe("error"));
    expect(readSessionToken()).toBe(token);
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("reports an error and keeps the cookie when /auth/me answers 500", async () => {
    const token = makeToken(nowSeconds() + SECONDS_PER_HOUR);
    storeToken(token);
    fetchMock.mockResolvedValue(jsonResponse({ status: 500 }, 500));

    renderProvider();

    await waitFor(() => expect(status()).toBe("error"));
    expect(readSessionToken()).toBe(token);
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("retries the restore after an error and becomes authenticated", async () => {
    storeToken(makeToken(nowSeconds() + SECONDS_PER_HOUR));
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ...USER, createdAt: "2026-11-01T10:00:00Z" }),
    );

    renderProvider();
    await waitFor(() => expect(status()).toBe("error"));

    fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));

    await waitFor(() => expect(status()).toBe("authenticated"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("becomes authenticated when a session is started", async () => {
    renderProvider();
    await waitFor(() => expect(status()).toBe("unauthenticated"));

    act(() => {
      startSession(
        authResponse(makeToken(nowSeconds() + SECONDS_PER_HOUR)),
        false,
      );
    });

    expect(status()).toBe("authenticated");
    expect(screen.getByTestId("email").textContent).toBe(USER.email);
  });

  it("logs out automatically when the token expires", async () => {
    renderProvider();
    await waitFor(() => expect(status()).toBe("unauthenticated"));
    vi.useFakeTimers();

    act(() => {
      startSession(
        authResponse(makeToken(nowSeconds() + SECONDS_PER_MINUTE)),
        false,
      );
    });
    expect(status()).toBe("authenticated");

    act(() => {
      vi.advanceTimersByTime(
        (SECONDS_PER_MINUTE + 1) * MILLISECONDS_PER_SECOND,
      );
    });

    expect(status()).toBe("unauthenticated");
    expect(routerMock.replace).toHaveBeenCalledWith("/login");
    expect(readSessionToken()).toBeUndefined();
  });

  it("logs out manually and cancels the expiry timer", async () => {
    renderProvider();
    await waitFor(() => expect(status()).toBe("unauthenticated"));
    vi.useFakeTimers();
    act(() => {
      startSession(
        authResponse(makeToken(nowSeconds() + SECONDS_PER_MINUTE)),
        false,
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Wyloguj" }));

    expect(status()).toBe("unauthenticated");
    expect(routerMock.replace).toHaveBeenCalledTimes(1);
    expect(readSessionToken()).toBeUndefined();

    act(() => {
      vi.advanceTimersByTime(2 * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND);
    });
    expect(routerMock.replace).toHaveBeenCalledTimes(1);
  });

  it("throws a clear error when useAuth is used outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<Probe />)).toThrow(
      "useAuth must be used within AuthProvider",
    );
  });
});
