import { z } from "zod";
export const MAX_DIAGRAM_NODES = 50;
export const MAX_DIAGRAM_EDGES = 100;

const id = z.string().min(1).max(80);
export const diagramNodeSchema = z.object({
  id,
  label: z.string().min(1).max(160),
  kind: z.enum(["start", "step", "decision", "end"]),
  x: z.number().finite().min(-10000).max(10000),
  y: z.number().finite().min(-10000).max(10000),
});
export const diagramEdgeSchema = z.object({
  id,
  source: id,
  target: id,
  label: z.string().max(120),
});
export type DiagramNode = z.infer<typeof diagramNodeSchema>;
export type DiagramEdge = z.infer<typeof diagramEdgeSchema>;
export type DiagramState = {
  revision: number;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  selectedNodeIds: string[];
};
export type DiagramEditResult =
  | { ok: true; state: DiagramState; error?: never }
  | { error: string; state: DiagramState; ok?: never };

export const diagramPatchSchema = z.object({
  expected_revision: z.number().int().nonnegative(),
  upsert_nodes: z.array(diagramNodeSchema).max(MAX_DIAGRAM_NODES),
  upsert_edges: z.array(diagramEdgeSchema).max(MAX_DIAGRAM_EDGES),
  remove_node_ids: z.array(id).max(MAX_DIAGRAM_NODES),
  remove_edge_ids: z.array(id).max(MAX_DIAGRAM_EDGES),
});
export function applyDiagramPatch(
  state: DiagramState,
  input: unknown,
): { state: DiagramState; error?: string } {
  const parsed = diagramPatchSchema.safeParse(input);
  if (!parsed.success)
    return {
      state,
      error:
        "Invalid changes: " +
        parsed.error.issues.map((issue) => issue.path.join(".") + ": " + issue.message).join("; "),
    };
  const patch = parsed.data;
  if (patch.expected_revision !== state.revision)
    return {
      state,
      error:
        "The canvas changed. Read get_diagram_state again and preserve the visitor’s latest edits.",
    };
  if (
    new Set(patch.upsert_nodes.map((n) => n.id)).size !== patch.upsert_nodes.length ||
    new Set(patch.upsert_edges.map((e) => e.id)).size !== patch.upsert_edges.length
  )
    return { state, error: "Duplicate IDs in changes." };
  const nodes = new Map(
    state.nodes.filter((n) => !patch.remove_node_ids.includes(n.id)).map((n) => [n.id, n]),
  );
  for (const node of patch.upsert_nodes) nodes.set(node.id, node);
  const edges = new Map(
    state.edges
      .filter(
        (e) => !patch.remove_edge_ids.includes(e.id) && nodes.has(e.source) && nodes.has(e.target),
      )
      .map((e) => [e.id, e]),
  );
  for (const edge of patch.upsert_edges) {
    if (!nodes.has(edge.source) || !nodes.has(edge.target))
      return { state, error: "Every connection must reference existing nodes." };
    edges.set(edge.id, edge);
  }
  if (nodes.size > MAX_DIAGRAM_NODES || edges.size > MAX_DIAGRAM_EDGES)
    return { state, error: "This demo supports up to 50 nodes and 100 connections." };
  return {
    state: {
      revision: state.revision + 1,
      nodes: [...nodes.values()],
      edges: [...edges.values()],
      selectedNodeIds: state.selectedNodeIds.filter((id) => nodes.has(id)),
    },
  };
}
export const emptyDiagram = (): DiagramState => ({
  revision: 0,
  nodes: [],
  edges: [],
  selectedNodeIds: [],
});
