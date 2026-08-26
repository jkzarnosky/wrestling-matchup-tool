import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "session";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set — copy .env.example to .env.local and fill it in.");
  }
  return secret;
}

/** Cookie value is `${sessionId}.${hmac}` -- an HMAC over the session id, so a tampered/guessed
 * cookie is rejected before we even hit the database. */
export function signSessionToken(sessionId: string): string {
  const signature = createHmac("sha256", getSecret()).update(sessionId).digest("hex");
  return `${sessionId}.${signature}`;
}

/** Returns the session id if the cookie's signature is valid, otherwise null. */
export function verifySessionToken(cookieValue: string): string | null {
  const [sessionId, signature] = cookieValue.split(".");
  if (!sessionId || !signature) return null;

  const expected = createHmac("sha256", getSecret()).update(sessionId).digest("hex");
  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }
  return sessionId;
}
