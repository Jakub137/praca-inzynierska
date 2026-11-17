import { describe, expect, it } from "vitest";
import { getTokenExpiryMs, isTokenActive } from "@/lib/auth/token";
import { makeToken, makeTokenWithRawPayload } from "@/test-utils/makeToken";

const EXPIRY_SECONDS = 1_900_000_000;
const EXPIRY_MS = EXPIRY_SECONDS * 1000;

describe("getTokenExpiryMs", () => {
  it("returns exp from the payload in milliseconds", () => {
    expect(getTokenExpiryMs(makeToken(EXPIRY_SECONDS))).toBe(EXPIRY_MS);
  });

  it("reads a payload that contains non-ASCII characters", () => {
    const token = makeToken(EXPIRY_SECONDS, "zażółć@example.com");

    expect(getTokenExpiryMs(token)).toBe(EXPIRY_MS);
  });

  it.each([
    ["an empty string", ""],
    ["a single segment", "abc"],
    ["two segments", "a.b"],
    ["four segments", "a.b.c.d"],
    ["invalid base64", "a.%%%.c"],
    ["a payload that is not JSON", makeTokenWithRawPayload("not json")],
    ["a payload that is not an object", makeTokenWithRawPayload("42")],
    ["a payload without exp", makeTokenWithRawPayload('{"email":"a@b.pl"}')],
    ["an exp that is not a number", makeTokenWithRawPayload('{"exp":"1"}')],
  ])("returns undefined for %s without throwing", (_label, token) => {
    expect(getTokenExpiryMs(token)).toBeUndefined();
  });
});

describe("isTokenActive", () => {
  it("is true before the expiry", () => {
    expect(isTokenActive(makeToken(EXPIRY_SECONDS), EXPIRY_MS - 1)).toBe(true);
  });

  it("is false at and after the expiry", () => {
    const token = makeToken(EXPIRY_SECONDS);

    expect(isTokenActive(token, EXPIRY_MS)).toBe(false);
    expect(isTokenActive(token, EXPIRY_MS + 1)).toBe(false);
  });

  it("is false for a malformed token", () => {
    expect(isTokenActive("abc", 0)).toBe(false);
  });
});
