import { allowedOrigins, cli, ensure, get, syncTool, syncVariation } from "../setup-shared.mjs";
import { readFileSync, writeFileSync } from "node:fs";

// Tool definitions and the generated resources file live next to this script; origins come from the conversation example.
const here = new URL("./cadenya/", import.meta.url);
const portalResources = new URL("../conversation/cadenya/resources.json", import.meta.url);
const toolSet = ensure(["tool-sets"], "sandbox-chess", {
  metadata: { name: "Sandbox chess", externalId: "sandbox-chess" },
  spec: {
    adapter: { type: "bare", bare: {} },
    overlays: [
      {
        key: "chess-arguments",
        disabled: false,
        selector: { operator: "OPERATOR_AND" },
        widgetArgumentExposure: { enabled: true },
      },
    ],
  },
});
const toolIds = {};
for (const name of ["get_board_state", "make_move"]) {
  const body = JSON.parse(readFileSync(new URL(`${name}.json`, here), "utf8"));
  const tool = syncTool(toolSet.metadata.id, body);
  toolIds[name] = tool.metadata.id;
}
const agent = ensure(["agents"], "sandbox-chess", {
  metadata: { name: "Cadenya Chess", externalId: "sandbox-chess" },
  spec: {
    description: "A chess opponent using live browser state.",
    variationSelectionMode: "VARIATION_SELECTION_MODE_RANDOM",
  },
});
const prompt = readFileSync(new URL("system-prompt.txt", here), "utf8").trim();
const variation = syncVariation({
  agentId: agent.metadata.id,
  variation: get([
    "agents",
    "variations",
    "retrieve",
    agent.metadata.id,
    "external_id:chess-opponent",
  ]),
  metadata: { name: "Chess opponent", externalId: "chess-opponent" },
  prompt,
  toolIds: Object.values(toolIds),
  maxToolCalls: 100,
  modelId: process.env.CADENYA_MODEL_ID,
});
if (agent.state !== "STATE_PUBLISHED") cli(["agents", "publish", agent.metadata.id]);
const origins = allowedOrigins(JSON.parse(readFileSync(portalResources, "utf8")).origins);
const widget = ensure(["widgets"], "sandbox-chess", {
  metadata: { name: "Sandbox chess", externalId: "sandbox-chess" },
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
  modelId: variation.spec.modelConfig.modelId,
  ...toolIds,
};
writeFileSync(new URL("chess-resources.json", here), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
