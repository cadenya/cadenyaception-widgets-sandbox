import test from "node:test";
import assert from "node:assert/strict";
import { visitorIdentity } from "./visitor.ts";

test("signed visitor identity survives re-minting", () => {
  const visitor = visitorIdentity(undefined, "test-key");
  assert.deepEqual(visitorIdentity(visitor.cookie, "test-key"), visitor);
});
test("forged cookie cannot select another visitor's history", () => {
  const visitor = visitorIdentity(undefined, "test-key");
  assert.notEqual(visitorIdentity(`${visitor.id}.${"a".repeat(64)}`, "test-key").id, visitor.id);
  assert.notEqual(visitorIdentity(visitor.cookie, "different-key").id, visitor.id);
  assert.doesNotThrow(() => visitorIdentity("bad.cookie", "test-key"));
});
test("separate anonymous visitors get separate identities", () => {
  assert.notEqual(visitorIdentity(undefined, "test-key").id, visitorIdentity(undefined, "test-key").id);
});
