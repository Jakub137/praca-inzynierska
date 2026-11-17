import { afterEach, describe, expect, it, vi } from "vitest";
import { SESSION_STARTED_EVENT } from "@/lib/auth/constants";
import {
  buildSessionCookie,
  endSession,
  readSessionToken,
  startSession,
} from "@/lib/auth/session";
import type { AuthResponse, AuthUserResponse } from "@/types/api";

const TOKEN = "header.payload.signature";
const EXPIRES_IN = 86400;
const USER: AuthUserResponse = {
  id: "1",
  email: "jan@example.com",
  firstName: "Jan",
  lastName: "Kowalski",
  defaultCurrency: "PLN",
};
const AUTH: AuthResponse = {
  accessToken: TOKEN,
  expiresIn: EXPIRES_IN,
  user: USER,
};

function spyOnCookieWrites() {
  return vi.spyOn(Document.prototype, "cookie", "set");
}

describe("buildSessionCookie", () => {
  it("sets Path and SameSite and omits Max-Age and Secure by default", () => {
    expect(buildSessionCookie(TOKEN, undefined, false)).toBe(
      `saldo_access_token=${TOKEN}; Path=/; SameSite=Lax`,
    );
  });

  it("adds Max-Age and Secure when requested", () => {
    expect(buildSessionCookie(TOKEN, 60, true)).toBe(
      `saldo_access_token=${TOKEN}; Path=/; SameSite=Lax; Max-Age=60; Secure`,
    );
  });
});

describe("session cookie", () => {
  afterEach(() => {
    endSession();
    vi.restoreAllMocks();
  });

  it("stores the token so that it can be read back", () => {
    startSession(AUTH, false);

    expect(readSessionToken()).toBe(TOKEN);
  });

  it("writes a session cookie without Max-Age when rememberMe is false", () => {
    const cookieWrites = spyOnCookieWrites();

    startSession(AUTH, false);

    const written = String(cookieWrites.mock.calls[0][0]);
    expect(written).toContain("Path=/");
    expect(written).toContain("SameSite=Lax");
    expect(written).not.toContain("Max-Age");
  });

  it("writes Max-Age equal to expiresIn when rememberMe is true", () => {
    const cookieWrites = spyOnCookieWrites();

    startSession(AUTH, true);

    expect(String(cookieWrites.mock.calls[0][0])).toContain(
      `Max-Age=${EXPIRES_IN}`,
    );
  });

  it("does not add Secure over http", () => {
    const cookieWrites = spyOnCookieWrites();

    startSession(AUTH, true);

    expect(String(cookieWrites.mock.calls[0][0])).not.toContain("Secure");
  });

  it("removes the cookie with Max-Age=0 and the same Path", () => {
    startSession(AUTH, true);
    const cookieWrites = spyOnCookieWrites();

    endSession();

    const written = String(cookieWrites.mock.calls[0][0]);
    expect(written).toContain("Max-Age=0");
    expect(written).toContain("Path=/");
    expect(readSessionToken()).toBeUndefined();
  });

  it("ignores other cookies when reading the token", () => {
    document.cookie = "other=1; Path=/";
    startSession(AUTH, false);

    expect(readSessionToken()).toBe(TOKEN);

    document.cookie = "other=; Path=/; Max-Age=0";
  });

  it("announces the started session with the user", () => {
    const listener = vi.fn();
    window.addEventListener(SESSION_STARTED_EVENT, listener);

    startSession(AUTH, false);

    window.removeEventListener(SESSION_STARTED_EVENT, listener);
    const event = listener.mock.calls[0][0] as CustomEvent<AuthUserResponse>;
    expect(event.detail).toEqual(USER);
  });

  it("never writes the token to the console", () => {
    const spies = (["log", "info", "debug", "warn", "error"] as const).map(
      (method) => vi.spyOn(console, method).mockImplementation(() => undefined),
    );

    startSession(AUTH, true);
    endSession();

    spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
  });
});
