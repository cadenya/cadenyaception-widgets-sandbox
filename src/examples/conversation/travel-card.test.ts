import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { travelCardSchema } from "./travel-card-schema.ts";

test("travel cards accept itinerary content and reject malformed tool arguments", () => {
  const card = {
    title: "A slow weekend",
    kind: "itinerary",
    location: "Lisbon",
    description: "A relaxed draft",
    highlights: ["Day 1: explore on foot"],
    timing: "3 days",
    budget: "",
  };
  assert.equal(travelCardSchema.safeParse(card).success, true);
  assert.equal(travelCardSchema.safeParse({ ...card, kind: "agent" }).success, false);
  assert.equal(
    travelCardSchema.safeParse({ ...card, highlights: Array(7).fill("Stop") }).success,
    true,
  );
  assert.equal(
    travelCardSchema.safeParse({ ...card, highlights: Array(30).fill("Day") }).success,
    true,
  );
  assert.equal(
    travelCardSchema.safeParse({ ...card, highlights: Array(31).fill("Stop") }).success,
    false,
  );
  assert.equal(travelCardSchema.safeParse({ ...card, title: "" }).success, false);
  assert.equal(travelCardSchema.safeParse(undefined).success, false);
});

test("bare tool contract and renderer agree on fields and card kinds", () => {
  const tool = JSON.parse(
    readFileSync(new URL("./cadenya/display-travel-card.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(
    Object.keys(travelCardSchema.shape).sort(),
    [...tool.spec.parameters.required].sort(),
  );
  assert.deepEqual(travelCardSchema.shape.kind.options, tool.spec.parameters.properties.kind.enum);
  assert.equal(tool.spec.parameters.properties.highlights.maxItems, 30);
  assert.equal(tool.spec.config.type, "bare");
  assert.ok(tool.spec.config.bare.alwaysSetResult);
});
