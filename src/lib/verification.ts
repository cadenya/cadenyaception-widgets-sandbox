import { createHmac, timingSafeEqual } from "node:crypto";

export const VERIFICATION_COOKIE = "cadenya-verification";
export const VERIFICATION_SECONDS = 30 * 60;
export const TURNSTILE_ACTION = "widgets_demo";

// A server-configured deadline lets short demo windows expire automatically.
export function demoVerificationExpiry(until: string | undefined, now = Date.now()): number | null {
  if (!until || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(until)) return null;
  const expiry = Date.parse(until);
  return Number.isFinite(expiry) && expiry > now ? expiry : null;
}

function signature(visitorId: string, expires: string, secret: string) {
  return createHmac("sha256", secret).update(`widgets-turnstile:v1:${visitorId}:${expires}`).digest("hex");
}

export function createVerification(visitorId: string, secret: string, now = Date.now()) {
  const expires = String(Math.floor(now / 1000) + VERIFICATION_SECONDS);
  return { cookie: `${expires}.${signature(visitorId, expires, secret)}`, expiresAt: Number(expires) * 1000 };
}

export function verificationExpiry(cookie: string | undefined, visitorId: string, secret: string, now = Date.now()): number | null {
  const match = /^(\d{10})\.([a-f0-9]{64})$/.exec(cookie ?? "");
  if (!match || !secret) return null;
  const [, expires, supplied] = match;
  const expiresAt = Number(expires) * 1000;
  if (expiresAt <= now || expiresAt > now + VERIFICATION_SECONDS * 1000) return null;
  if (!timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(signature(visitorId, expires, secret), "hex"))) return null;
  return expiresAt;
}

export async function verifyTurnstile(token: unknown, secret: string, hostname: string, send: typeof fetch = fetch): Promise<boolean> {
  if (!secret || typeof token !== "string" || !token.trim() || token.length > 2048) return false;
  const response = await send("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Turnstile verification service unavailable");
  const result: unknown = await response.json();
  if (!result || typeof result !== "object") return false;
  const data = result as Record<string, unknown>;
  return data.success === true && data.hostname === hostname && data.action === TURNSTILE_ACTION;
}

// Bound the actual body, not just the caller-controlled Content-Length header.
export async function readVerificationToken(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("Expected JSON");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing request body");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 4096) {
        await reader.cancel();
        throw new Error("Request body too large");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const data: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  return data && typeof data === "object" ? (data as Record<string, unknown>).token : undefined;
}
