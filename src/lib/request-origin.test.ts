import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { allowedRequestOrigin, turnstileHostname } from "./request-origin.ts";

function env(t: TestContext, key: string, value: string) {
  const previous = process.env[key];
  process.env[key] = value;
  t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
}

test("production rejects local tokens even when shared configuration allows localhost", t => {
  env(t, "NODE_ENV", "production");
  env(t, "CADENYA_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000");
  env(t, "TURNSTILE_HOSTNAMES", "localhost,127.0.0.1,widgets-demo.cadenya.com");
  for (const origin of ["http://localhost:3000", "http://127.0.0.1:3000"]) {
    assert.equal(allowedRequestOrigin(new Request("https://widgets-demo.cadenya.com", { headers: { origin } })), null);
    assert.equal(turnstileHostname(origin), null);
  }
  assert.equal(turnstileHostname("https://widgets-demo.cadenya.com"), "widgets-demo.cadenya.com");
  assert.equal(turnstileHostname("https://attacker.example"), null);
  assert.equal(allowedRequestOrigin(new Request("https://widgets-demo.cadenya.com")), null);
});

test("development supports localhost while previews require an explicit hostname", t => {
  env(t, "NODE_ENV", "development");
  env(t, "TURNSTILE_HOSTNAMES", "");
  assert.equal(turnstileHostname("http://localhost:3000"), "localhost");
  assert.equal(turnstileHostname("https://demo-preview.vercel.app"), null);
  env(t, "TURNSTILE_HOSTNAMES", "demo-preview.vercel.app");
  assert.equal(turnstileHostname("https://demo-preview.vercel.app"), "demo-preview.vercel.app");
});
