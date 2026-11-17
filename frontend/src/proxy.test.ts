// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "@/proxy";
import { makeToken } from "@/test-utils/makeToken";

const ORIGIN = "http://localhost:3000";
const COOKIE_NAME = "saldo_access_token";
const SECONDS_PER_HOUR = 3600;

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function validToken(): string {
  return makeToken(nowSeconds() + SECONDS_PER_HOUR);
}

function expiredToken(): string {
  return makeToken(nowSeconds() - SECONDS_PER_HOUR);
}

function request(path: string, token?: string): NextRequest {
  const headers = token ? { cookie: `${COOKIE_NAME}=${token}` } : undefined;
  return new NextRequest(`${ORIGIN}${path}`, { headers });
}

function expectRedirect(response: Response, path: string) {
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe(`${ORIGIN}${path}`);
}

function expectPass(response: Response) {
  expect(response.headers.get("location")).toBeNull();
  expect(response.status).toBe(200);
}

describe("proxy: private routes", () => {
  it("redirects to /login without a cookie", () => {
    expectRedirect(proxy(request("/dashboard")), "/login");
  });

  it("lets a valid session through", () => {
    expectPass(proxy(request("/dashboard", validToken())));
  });

  it("redirects an expired token to /login and clears the cookie", () => {
    const response = proxy(request("/dashboard", expiredToken()));

    expectRedirect(response, "/login");
    expect(response.cookies.get(COOKIE_NAME)?.value).toBe("");
    expect(response.cookies.get(COOKIE_NAME)?.maxAge).toBe(0);
  });

  it("treats a malformed token as no session without throwing", () => {
    expectRedirect(proxy(request("/dashboard", "abc")), "/login");
  });

  it("does not set a clearing cookie when there was no cookie", () => {
    expect(
      proxy(request("/dashboard")).cookies.get(COOKIE_NAME),
    ).toBeUndefined();
  });

  it.each([
    "/transactions",
    "/transactions/123",
    "/settings",
    "/a-page-that-does-not-exist-yet",
  ])("protects %s by default", (path) => {
    expectRedirect(proxy(request(path)), "/login");
  });

  it("matches public paths exactly, not by prefix", () => {
    expectRedirect(proxy(request("/login/extra")), "/login");
  });

  it("never copies the requested address into the redirect (no ?next=)", () => {
    const response = proxy(request("/dashboard?next=https://evil.example"));

    expectRedirect(response, "/login");
  });
});

describe("proxy: guest-only routes", () => {
  it.each(["/login", "/register"])(
    "redirects a valid session from %s to /dashboard",
    (path) => {
      expectRedirect(proxy(request(path, validToken())), "/dashboard");
    },
  );

  it.each(["/login", "/register"])("lets a guest open %s", (path) => {
    expectPass(proxy(request(path)));
  });

  it.each(["/login", "/register"])("lets an expired token open %s", (path) => {
    expectPass(proxy(request(path, expiredToken())));
  });
});

describe("proxy: public routes", () => {
  it("does not touch / with or without a session", () => {
    expectPass(proxy(request("/")));
    expectPass(proxy(request("/", validToken())));
  });
});
