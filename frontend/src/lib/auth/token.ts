const MILLISECONDS_PER_SECOND = 1000;
const JWT_PART_COUNT = 3;
const BASE64_BLOCK_LENGTH = 4;

function decodeBase64Url(value: string): string {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(
    Math.ceil(base64.length / BASE64_BLOCK_LENGTH) * BASE64_BLOCK_LENGTH,
    "=",
  );
  const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function readPayload(token: string): unknown {
  const parts = token.split(".");
  if (parts.length !== JWT_PART_COUNT) {
    return undefined;
  }
  try {
    return JSON.parse(decodeBase64Url(parts[1]));
  } catch {
    return undefined;
  }
}

// The signature is NOT verified here: the backend verifies every request, so this
// value is only used to decide redirects and the logout timer. A malformed token
// yields undefined and is treated as "no session" (never throws).
export function getTokenExpiryMs(token: string): number | undefined {
  const payload = readPayload(token);
  if (typeof payload !== "object" || payload === null || !("exp" in payload)) {
    return undefined;
  }
  const { exp } = payload;
  if (typeof exp !== "number" || !Number.isFinite(exp)) {
    return undefined;
  }
  return exp * MILLISECONDS_PER_SECOND;
}

export function isTokenActive(
  token: string,
  nowMs: number = Date.now(),
): boolean {
  const expiryMs = getTokenExpiryMs(token);
  return expiryMs !== undefined && expiryMs > nowMs;
}
