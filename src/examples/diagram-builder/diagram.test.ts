import test from "node:test";
import assert from "node:assert/strict";
import { applyDiagramPatch, emptyDiagram } from "./diagram-state.ts";
const node = (id: string) => ({ id, label: id, kind: "step", x: 0, y: 0 });
const patch = {
  expected_revision: 0,
  upsert_nodes: [node("a"), node("b")],
  upsert_edges: [{ id: "ab", source: "a", target: "b", label: "" }],
  remove_node_ids: [],
  remove_edge_ids: [],
};
test("diagram changes are atomic and reject dangling edges and malformed data", () => {
  const initial = emptyDiagram();
  const bad = applyDiagramPatch(initial, {
    ...patch,
    upsert_edges: [{ id: "bad", source: "a", target: "missing", label: "" }],
  });
  assert.ok(bad.error);
  assert.equal(bad.state, initial);
  assert.ok(
    applyDiagramPatch(initial, { ...patch, upsert_nodes: [{ ...node("a"), x: Infinity }] }).error,
  );
  const valid = applyDiagramPatch(initial, patch);
  assert.equal(valid.error, undefined);
  assert.equal(valid.state.nodes.length, 2);
  assert.equal(valid.state.revision, 1);
});
test("stale edits preserve user changes; node deletion cleans connections and selection", () => {
  const created = applyDiagramPatch(emptyDiagram(), patch).state;
  const edited = {
    ...created,
    revision: 2,
    nodes: created.nodes.map((n) => ({ ...n, x: 400 })),
    selectedNodeIds: ["a"],
  };
  const stale = applyDiagramPatch(edited, { ...patch, expected_revision: 1 });
  assert.ok(stale.error);
  assert.equal(stale.state, edited);
  const deleted = applyDiagramPatch(edited, {
    ...patch,
    expected_revision: 2,
    upsert_nodes: [],
    upsert_edges: [],
    remove_node_ids: ["a"],
  });
  assert.equal(deleted.state.nodes.length, 1);
  assert.equal(deleted.state.edges.length, 0);
  assert.deepEqual(deleted.state.selectedNodeIds, []);
  assert.ok(applyDiagramPatch(deleted.state, { ...patch, expected_revision: 2 }).error);
});
