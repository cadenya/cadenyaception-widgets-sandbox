import {
  allowedOrigins,
  cli,
  ensure,
  FAKER_TOOL_SET_ID,
  get,
  syncTool,
  syncVariation,
} from "../setup-shared.mjs";
import { readFileSync, writeFileSync } from "node:fs";

// Tool definitions and the generated resources file live next to this script; origins come from the conversation example.
const here = new URL("./cadenya/", import.meta.url);
const portalResources = new URL("../conversation/cadenya/resources.json", import.meta.url);
const toolSet = ensure(["tool-sets"], "sandbox-diagram", {
  metadata: { name: "Sandbox diagram", externalId: "sandbox-diagram" },
  spec: {
    adapter: { type: "bare", bare: {} },
    overlays: [
      {
        key: "diagram-arguments",
        disabled: false,
        selector: { operator: "OPERATOR_AND" },
        widgetArgumentExposure: { enabled: true },
      },
    ],
  },
});
const toolIds = {};
for (const name of ["get_diagram_state", "apply_diagram_changes"]) {
  const body = JSON.parse(readFileSync(new URL(`${name}.json`, here), "utf8"));
  const tool = syncTool(toolSet.metadata.id, body);
  toolIds[name] = tool.metadata.id;
}
const agent = ensure(["agents"], "sandbox-diagram", {
  metadata: { name: "Cadenya Diagram", externalId: "sandbox-diagram" },
  spec: {
    description: "A collaborative diagram builder using live canvas state.",
    variationSelectionMode: "VARIATION_SELECTION_MODE_RANDOM",
  },
});
const prompt = readFileSync(new URL("system-prompt.txt", here), "utf8");
const variation = syncVariation({
  agentId: agent.metadata.id,
  variation: get([
    "agents",
    "variations",
    "retrieve",
    agent.metadata.id,
    "external_id:diagram-builder",
  ]),
  metadata: { name: "Diagram builder", externalId: "diagram-builder" },
  prompt,
  toolIds: Object.values(toolIds),
  toolSetIds: FAKER_TOOL_SET_ID ? [FAKER_TOOL_SET_ID] : [],
  maxToolCalls: 100,
  modelId: process.env.CADENYA_MODEL_ID,
});
if (agent.state !== "STATE_PUBLISHED") cli(["agents", "publish", agent.metadata.id]);
const origins = allowedOrigins(JSON.parse(readFileSync(portalResources, "utf8")).origins);
const widget = ensure(["widgets"], "sandbox-diagram", {
  metadata: { name: "Sandbox diagram", externalId: "sandbox-diagram" },
  spec: {
    agentId: agent.metadata.id,
    variationId: variation.metadata.id,
    originAllowlist: origins,
  },
});
const mergedOrigins = allowedOrigins([...widget.spec.originAllowlist, ...origins]);
if (mergedOrigins.length !== widget.spec.originAllowlist.length)
  cli(["widgets", "update", widget.metadata.id], {
    spec: { agentId: agent.metadata.id, originAllowlist: mergedOrigins },
    updateMask: "spec.originAllowlist",
  });
const result = {
  agentId: agent.metadata.id,
  variationId: variation.metadata.id,
  widgetId: widget.metadata.id,
  toolSetId: toolSet.metadata.id,
  fakeDataToolSetId: FAKER_TOOL_SET_ID,
  modelId: variation.spec.modelConfig.modelId,
  ...toolIds,
};
writeFileSync(new URL("diagram-resources.json", here), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
