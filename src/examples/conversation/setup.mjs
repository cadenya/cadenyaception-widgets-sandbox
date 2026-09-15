import { readFileSync, writeFileSync } from "node:fs";
import {
  allowedOrigins,
  cli,
  ensure,
  FAKER_TOOL_SET_ID,
  get,
  syncTool,
  syncVariation,
} from "../setup-shared.mjs";

const here = new URL("./cadenya/", import.meta.url);
const origins = allowedOrigins();
const bare = ensure(["tool-sets"], "cadenyaception-cards", {
  metadata: { name: "Travel concierge tools", externalId: "cadenyaception-cards" },
  spec: {
    description: "Travel cards, trip forms, approvals, and browser emoji tools",
    adapter: { type: "bare", bare: {} },
    overlays: [
      {
        key: "expose-card-arguments",
        selector: { operator: "OPERATOR_AND" },
        disabled: false,
        widgetArgumentExposure: { enabled: true },
      },
    ],
  },
});
const toolIds = {};
for (const [key, file] of Object.entries({
  displayTravelCardToolId: "display-travel-card.json",
  displayFormToolId: "display-form.json",
  approvalDemoToolId: "approval-demo.json",
  frontendEmojiToolId: "read-frontend-emoji.json",
  shuffleFrontendEmojiToolId: "shuffle-frontend-emoji.json",
})) {
  toolIds[key] = syncTool(
    bare.metadata.id,
    JSON.parse(readFileSync(new URL(file, here), "utf8")),
  ).metadata.id;
}
const agent = ensure(["agents"], "cadenyaception-portal", {
  metadata: { name: "Travel concierge", externalId: "cadenyaception-portal" },
  spec: {
    description:
      "Plan a trip with destination cards, interactive forms, and a playful browser emoji companion.",
    variationSelectionMode: "VARIATION_SELECTION_MODE_RANDOM",
  },
});
if (
  agent.metadata.name !== "Travel concierge" ||
  agent.spec.description !==
    "Plan a trip with destination cards, interactive forms, and a playful browser emoji companion."
) {
  cli(["agents", "update", agent.metadata.id], {
    metadata: { name: "Travel concierge" },
    spec: {
      description:
        "Plan a trip with destination cards, interactive forms, and a playful browser emoji companion.",
      variationSelectionMode: agent.spec.variationSelectionMode,
    },
    updateMask: "metadata.name,spec.description",
  });
}
const prompt = readFileSync(new URL("system-prompt.txt", here), "utf8").trim();
const variation = syncVariation({
  agentId: agent.metadata.id,
  variation: get([
    "agents",
    "variations",
    "retrieve",
    agent.metadata.id,
    "external_id:resource-portal",
  ]),
  metadata: { name: "Travel concierge", externalId: "resource-portal" },
  prompt,
  toolIds: Object.values(toolIds),
  toolSetIds: FAKER_TOOL_SET_ID ? [FAKER_TOOL_SET_ID] : [],
  maxToolCalls: 30,
  modelId: process.env.CADENYA_MODEL_ID,
});
if (agent.state !== "STATE_PUBLISHED") cli(["agents", "publish", agent.metadata.id]);
const widget = ensure(["widgets"], "cadenyaception-portal", {
  metadata: { name: "Travel concierge", externalId: "cadenyaception-portal" },
  spec: {
    agentId: agent.metadata.id,
    variationId: variation.metadata.id,
    originAllowlist: origins,
  },
});
const mergedOrigins = allowedOrigins(widget.spec.originAllowlist);
if (JSON.stringify(mergedOrigins) !== JSON.stringify(widget.spec.originAllowlist))
  cli(["widgets", "update", widget.metadata.id], {
    spec: { agentId: agent.metadata.id, originAllowlist: mergedOrigins },
    updateMask: "spec.originAllowlist",
  });
const config = {
  workspaceId: agent.metadata.workspaceId,
  agentId: agent.metadata.id,
  variationId: variation.metadata.id,
  widgetId: widget.metadata.id,
  toolSetId: bare.metadata.id,
  fakeDataToolSetId: FAKER_TOOL_SET_ID,
  ...toolIds,
  modelId: variation.spec.modelConfig.modelId,
  origins: mergedOrigins,
};
writeFileSync(new URL("resources.json", here), JSON.stringify(config, null, 2) + "\n");
console.log(JSON.stringify(config, null, 2));
