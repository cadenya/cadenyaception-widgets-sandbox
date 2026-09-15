import test from "node:test";
import assert from "node:assert/strict";
import { createVerification, demoVerificationExpiry, readVerificationToken, verificationExpiry, verifyTurnstile, VERIFICATION_SECONDS } from "./verification.ts";

const now = 1_800_000_000_000;
test("temporary demo verification bypass expires at its exact UTC deadline", () => {
  const deadline = "2026-09-14T20:25:00Z";
  const expiry = Date.parse(deadline);
  assert.equal(demoVerificationExpiry(deadline, expiry - 1), expiry);
  assert.equal(demoVerificationExpiry(deadline, expiry), null);
  assert.equal(demoVerificationExpiry(deadline, expiry + 1), null);
  for (const invalid of [undefined, "", "true", "forever", "2026-09-14", "2026-99-99T99:99:99Z"]) {
    assert.equal(demoVerificationExpiry(invalid, expiry - 1), null);
  }
});
test("verification cookies are signed, visitor-bound, and expire without sliding", () => {
  const verified = createVerification("visitor-a", "secret", now);
  assert.equal(verificationExpiry(verified.cookie, "visitor-a", "secret", now), now + VERIFICATION_SECONDS * 1000);
  assert.equal(verificationExpiry(verified.cookie, "visitor-b", "secret", now), null);
  assert.equal(verificationExpiry(verified.cookie, "visitor-a", "other-secret", now), null);
  assert.equal(verificationExpiry(verified.cookie, "visitor-a", "secret", verified.expiresAt), null);
  assert.equal(verificationExpiry(`9999999999.${verified.cookie.split(".")[1]}`, "visitor-a", "secret", now), null);
  assert.equal(verificationExpiry(verified.cookie + ".extra", "visitor-a", "secret", now), null);
  assert.equal(verificationExpiry(undefined, "visitor-a", "secret", now), null);
});

test("Siteverify must confirm success, action, and the expected hostname", async () => {
  const valid = { success: true, hostname: "widgets-demo.cadenya.com", action: "widgets_demo" };
  const check = (data: unknown) => verifyTurnstile("challenge-token", "secret", valid.hostname, async (url, init) => {
    assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    assert.deepEqual(JSON.parse(init?.body as string), { secret: "secret", response: "challenge-token" });
    return Response.json(data);
  });
  assert.equal(await check(valid), true);
  assert.equal(await check({ ...valid, success: false, "error-codes": ["timeout-or-duplicate"] }), false);
  assert.equal(await check({ ...valid, hostname: "attacker.example" }), false);
  assert.equal(await check({ ...valid, action: "another_action" }), false);
  assert.equal(await check({ success: true }), false);
  assert.equal(await check(null), false);
});

test("invalid token inputs are rejected before contacting Cloudflare; outages do not pass", async () => {
  const unexpected = async (): Promise<Response> => { throw new Error("Unexpected request"); };
  for (const token of [undefined, 42, "", " ", "x".repeat(2049)]) assert.equal(await verifyTurnstile(token, "secret", "localhost", unexpected), false);
  assert.equal(await verifyTurnstile("token", "", "localhost", unexpected), false);
  await assert.rejects(verifyTurnstile("token", "secret", "localhost", async () => new Response(null, { status: 503 })), /unavailable/);
  await assert.rejects(verifyTurnstile("token", "secret", "localhost", async () => { throw new Error("Network unavailable"); }), /Network/);
});

test("verification request parsing limits actual body size and requires JSON", async () => {
  const request = (body: string, contentType = "application/json") => new Request("https://example.com/api/verification", { method: "POST", headers: { "Content-Type": contentType }, body });
  assert.equal(await readVerificationToken(request(JSON.stringify({ token: "test-token" }))), "test-token");
  await assert.rejects(readVerificationToken(request("{}", "text/plain")), /Expected JSON/);
  await assert.rejects(readVerificationToken(request("not JSON")));
  await assert.rejects(readVerificationToken(request(JSON.stringify({ token: "x".repeat(4096) }))), /too large/);
});
