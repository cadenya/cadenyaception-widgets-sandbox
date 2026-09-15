import test from "node:test";
import assert from "node:assert/strict";
import { formToolArgumentsSchema, readFormDecision } from "./form-tool-schema.ts";

test("form envelopes reject non-object schemas and unsafe rendering values", () => {
  const valid = {
    title: "Trip",
    schema: { type: "object", properties: { destination: { type: "string" } } },
  };
  const parsed = formToolArgumentsSchema.parse(valid);
  assert.deepEqual(parsed.formData, {});
  assert.equal(parsed.schema.type, "object");
  for (const invalid of [
    null,
    [],
    { ...valid, title: {} },
    { ...valid, formData: [] },
    { ...valid, schema: { type: "string" } },
  ]) {
    assert.equal(formToolArgumentsSchema.safeParse(invalid).success, false);
  }
});

test("form history distinguishes cancellation and ignores malformed results", () => {
  assert.equal(readFormDecision('{"status":"cancelled"}'), "cancelled");
  assert.equal(
    readFormDecision('{"status":"submitted","data":{"destination":"Kyoto"}}'),
    "submitted",
  );
  for (const invalid of [undefined, "not JSON", "null", "{}", '{"status":"failed"}'])
    assert.equal(readFormDecision(invalid), null);
});
