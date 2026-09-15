import test from "node:test";
import assert from "node:assert/strict";
import { syncVariation } from "./setup-shared.mjs";

test("setup removes broad and stray assignments, keeps allowed tools, and switches existing models", () => {
  const variation = {
    metadata: { id: "variation", name: "Travel concierge" },
    spec: {
      systemPromptTemplate: "old prompt",
      modelConfig: { modelId: "old-model", temperature: 0.8 },
      constraints: { maxToolCalls: 100, inactivityTimeout: "3600s" },
    },
    info: {
      assignments: [
        { id: "whole-api", toolSet: { id: "cadenya-api" } },
        { id: "whole-bare", toolSet: { id: "presentation" } },
        { id: "api-tool", tool: { id: "delete-agent" } },
        { id: "sub-agent", subAgent: { id: "admin" } },
        { id: "allowed", tool: { id: "card" } },
        { id: "duplicate", tool: { id: "card" } },
      ],
    },
  };
  const calls: { args: string[]; body: unknown }[] = [];
  const run = (args: string[], body?: unknown) => {
    calls.push({ args, body });
    return variation;
  };
  syncVariation(
    {
      agentId: "agent",
      variation,
      metadata: variation.metadata,
      prompt: "travel prompt",
      toolIds: ["card", "form"],
      maxToolCalls: 30,
      modelId: "openrouter.glm",
    },
    run,
  );
  assert.deepEqual(
    calls.filter((c) => c.args[2] === "remove-assignment").map((c) => c.args.at(-1)),
    ["whole-api", "whole-bare", "api-tool", "sub-agent", "duplicate"],
  );
  assert.deepEqual(
    calls.filter((c) => c.args[2] === "add-assignment").map((c) => c.body),
    [{ type: "toolId", toolId: "form" }],
  );
  const update = calls.find((call) => call.args[2] === "update")?.body;
  assert.ok(update && typeof update === "object");
  assert.ok("updateMask" in update && typeof update.updateMask === "string");
  assert.ok(update.updateMask.split(",").includes("spec.modelConfig"));
  assert.ok("spec" in update && update.spec && typeof update.spec === "object");
  assert.ok("modelConfig" in update.spec);
  assert.deepEqual(update.spec.modelConfig, { modelId: "openrouter.glm" });
});

test("rerunning setup preserves the existing model without an override and makes no mutations", () => {
  const variation = {
    metadata: { id: "variation", name: "Travel concierge" },
    spec: {
      systemPromptTemplate: "prompt",
      modelConfig: { modelId: "configured-glm" },
      constraints: { maxToolCalls: 30, inactivityTimeout: "3600s" },
    },
    info: { assignments: [{ id: "assigned", tool: { id: "card" } }] },
  };
  const calls: string[][] = [];
  syncVariation(
    {
      agentId: "agent",
      variation,
      metadata: variation.metadata,
      prompt: "prompt",
      toolIds: ["card"],
      maxToolCalls: 30,
      modelId: undefined,
    },
    (args) => {
      calls.push(args);
      return variation;
    },
  );
  assert.deepEqual(
    calls.map((args) => args[2]),
    ["retrieve"],
  );
});

test("new demos require an explicit model before making API calls", () => {
  assert.throws(
    () =>
      syncVariation(
        {
          agentId: "agent",
          variation: null,
          metadata: { name: "Travel" },
          prompt: "prompt",
          toolIds: [],
          maxToolCalls: 30,
          modelId: "",
        },
        () => {
          throw new Error("Unexpected API call");
        },
      ),
    /Set CADENYA_MODEL_ID/,
  );
});

test("explicit Faker tool-set attachments survive reruns while unrelated sets are removed", () => {
  const variation = {
    metadata: { id: "variation", name: "Travel concierge" },
    spec: {
      systemPromptTemplate: "prompt",
      modelConfig: { modelId: "glm" },
      constraints: { maxToolCalls: 30, inactivityTimeout: "3600s" },
    },
    info: {
      assignments: [
        { id: "faker", toolSet: { id: "faker-set" } },
        { id: "api", toolSet: { id: "management-api" } },
        { id: "card", tool: { id: "card-tool" } },
      ],
    },
  };
  const calls: { args: string[]; body: unknown }[] = [];
  syncVariation(
    {
      agentId: "agent",
      variation,
      metadata: variation.metadata,
      prompt: "prompt",
      toolIds: ["card-tool"],
      toolSetIds: ["faker-set"],
      maxToolCalls: 30,
      modelId: "glm",
    },
    (args, body) => {
      calls.push({ args, body });
      return variation;
    },
  );
  assert.deepEqual(
    calls.filter((c) => c.args[2] === "remove-assignment").map((c) => c.args.at(-1)),
    ["api"],
  );
  assert.equal(calls.filter((c) => c.args[2] === "add-assignment").length, 0);
});
