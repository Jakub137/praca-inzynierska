const SIGNATURE = "test-signature";

function encode(value: string): string {
  return Buffer.from(value).toString("base64url");
}

export function makeTokenWithRawPayload(payload: string): string {
  return `${encode(JSON.stringify({ alg: "HS256" }))}.${encode(payload)}.${SIGNATURE}`;
}

export function makeToken(
  expiresAtSeconds: number,
  email = "jan@example.com",
): string {
  return makeTokenWithRawPayload(
    JSON.stringify({ exp: expiresAtSeconds, email }),
  );
}
