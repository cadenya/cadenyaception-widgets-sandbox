import { spawnSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";

export const FAKER_TOOL_SET_ID = process.env.CADENYA_FAKER_TOOL_SET_ID?.trim() || undefined;

export function cli(args, body) {
  const result = spawnSync(
    "cadenya",
    [...args, ...(body ? ["-f", "-"] : []), "--display", "json"],
    {
      encoding: "utf8",
      input: body ? JSON.stringify(body) : undefined,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim() ? JSON.parse(result.stdout) : null;
}

export function get(args) {
  try {
    return cli(args);
  } catch (error) {
    if (/404|not found/i.test(error.message)) return null;
    throw error;
  }
}

export function ensure(group, externalId, body) {
  return (
    get([...group, "retrieve", `external_id:${externalId}`]) ?? cli([...group, "create"], body)
  );
}

// Keep the checked-in bare tool contracts authoritative on reruns as well.
export function syncTool(toolSetId, body) {
  const group = ["tool-sets", "tools"];
  const current = get([...group, "retrieve", toolSetId, `external_id:${body.metadata.externalId}`]);
  if (!current) return cli([...group, "create", toolSetId], body);
  const fields = Object.keys(body.spec).filter(
    (key) => !isDeepStrictEqual(current.spec[key], body.spec[key]),
  );
  if (current.metadata.name !== body.metadata.name) fields.push("name");
  if (!fields.length) return current;
  return cli([...group, "update", toolSetId, current.metadata.id], {
    ...body,
    updateMask: fields.map((key) => (key === "name" ? "metadata.name" : `spec.${key}`)).join(","),
  });
}

export function allowedOrigins(existing = []) {
  return [
    ...new Set(
      [
        ...existing,
        "http://localhost:3000",
        "https://widgets-demo.cadenya.com",
        ...(process.env.CADENYA_ALLOWED_ORIGINS || "").split(",").filter((value) => value.trim()),
      ].map((value) => new URL(value.trim()).origin),
    ),
  ];
}

// The examples own these variations. Reconcile an exact tool allowlist, including
// preserving explicitly approved MCP sets and removing all other assignments.
export function syncVariation(
  {
    agentId,
    variation,
    metadata,
    prompt,
    toolIds,
    toolSetIds = /** @type {string[]} */ ([]),
    maxToolCalls,
    modelId,
  },
  run = cli,
) {
  const selectedModel = modelId?.trim() || variation?.spec.modelConfig?.modelId;
  if (!selectedModel)
    throw new Error(
      "Set CADENYA_MODEL_ID to an enabled Cadenya model reference before creating a demo variation.",
    );
  const spec = {
    systemPromptTemplate: prompt,
    constraints: { maxToolCalls, inactivityTimeout: "3600s" },
    modelConfig: { modelId: selectedModel },
  };
  if (!variation) variation = run(["agents", "variations", "create", agentId], { metadata, spec });
  const fields = [];
  if (variation.spec.systemPromptTemplate !== prompt) fields.push("spec.systemPromptTemplate");
  if (variation.spec.constraints?.maxToolCalls !== maxToolCalls)
    fields.push("spec.constraints.maxToolCalls");
  if (variation.spec.constraints?.inactivityTimeout !== "3600s")
    fields.push("spec.constraints.inactivityTimeout");
  // Provider-specific settings must match the selected model.
  if (variation.spec.modelConfig?.modelId !== selectedModel) fields.push("spec.modelConfig");
  if (variation.metadata.name !== metadata.name) fields.push("metadata.name");
  if (variation.spec.progressiveDiscovery) fields.push("spec.progressiveDiscovery");
  if (fields.length)
    run(["agents", "variations", "update", agentId, variation.metadata.id], {
      metadata: { name: metadata.name },
      spec,
      updateMask: fields.join(","),
    });
  const wanted = new Set(toolIds);
  const wantedSets = new Set(toolSetIds);
  const kept = new Set();
  const keptSets = new Set();
  for (const assignment of variation.info?.assignments ?? []) {
    const id = assignment.tool?.id;
    const setId = assignment.toolSet?.id;
    if (id && wanted.has(id) && !kept.has(id)) kept.add(id);
    else if (setId && wantedSets.has(setId) && !keptSets.has(setId)) keptSets.add(setId);
    else
      run([
        "agents",
        "variations",
        "remove-assignment",
        agentId,
        variation.metadata.id,
        assignment.id,
      ]);
  }
  for (const toolSetId of wantedSets) {
    if (!keptSets.has(toolSetId))
      run(["agents", "variations", "add-assignment", agentId, variation.metadata.id], {
        type: "toolSetId",
        toolSetId,
      });
  }
  for (const toolId of wanted) {
    if (!kept.has(toolId))
      run(["agents", "variations", "add-assignment", agentId, variation.metadata.id], {
        type: "toolId",
        toolId,
      });
  }
  return run(["agents", "variations", "retrieve", agentId, variation.metadata.id]);
}
