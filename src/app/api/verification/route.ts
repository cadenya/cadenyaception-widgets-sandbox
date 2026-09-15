import "server-only";
import { cookies } from "next/headers";
import { allowedRequestOrigin, turnstileHostname } from "@/lib/request-origin";
import { visitorIdentity } from "@/lib/visitor";
import { createVerification, demoVerificationExpiry, readVerificationToken, verificationExpiry, verifyTurnstile, VERIFICATION_COOKIE, VERIFICATION_SECONDS } from "@/lib/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, private" };
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

export async function GET() {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const apiKey = process.env.CADENYA_API_KEY;
  const demoExpiry = demoVerificationExpiry(process.env.TURNSTILE_BYPASS_UNTIL);
  if (apiKey && demoExpiry) return Response.json({ verified: true, expiresAt: demoExpiry }, { headers });
  if (!secret || !apiKey) return Response.json({ verified: false }, { headers });
  const jar = await cookies();
  const visitor = visitorIdentity(jar.get("cadenyaception-visitor")?.value, apiKey);
  const expiresAt = verificationExpiry(jar.get(VERIFICATION_COOKIE)?.value, visitor.id, secret);
  return Response.json({ verified: expiresAt !== null, expiresAt }, { headers });
}

export async function POST(request: Request) {
  const origin = allowedRequestOrigin(request);
  const hostname = origin && turnstileHostname(origin);
  if (!hostname) return Response.json({ error: "This origin is not allowed." }, { status: 403, headers });
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const apiKey = process.env.CADENYA_API_KEY;
  if (!secret || !apiKey) return Response.json({ error: "Verification is temporarily unavailable. Please try again later." }, { status: 503, headers });
  let token: unknown;
  try { token = await readVerificationToken(request); }
  catch { return Response.json({ error: "Invalid verification request." }, { status: 400, headers }); }
  try {
    if (!await verifyTurnstile(token, secret, hostname)) {
      return Response.json({ error: "Verification failed or expired. Please try again." }, { status: 403, headers });
    }
  } catch {
    return Response.json({ error: "Verification could not be completed. Please try again." }, { status: 503, headers });
  }
  const jar = await cookies();
  const visitor = visitorIdentity(jar.get("cadenyaception-visitor")?.value, apiKey);
  const verification = createVerification(visitor.id, secret);
  jar.set("cadenyaception-visitor", visitor.cookie, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
  jar.set(VERIFICATION_COOKIE, verification.cookie, { ...cookieOptions, maxAge: VERIFICATION_SECONDS });
  return Response.json({ verified: true, expiresAt: verification.expiresAt }, { headers });
}
