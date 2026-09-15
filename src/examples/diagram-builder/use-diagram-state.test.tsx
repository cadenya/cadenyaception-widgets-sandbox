import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { useDiagramState } from "./use-diagram-state";

afterEach(cleanup);
const node = (id: string) => ({ id, label: id, kind: "step", x: 0, y: 0 });
const patch = {
  expected_revision: 0,
  upsert_nodes: [node("a"), node("b")],
  upsert_edges: [{ id: "ab", source: "a", target: "b", label: "" }],
  remove_node_ids: [],
  remove_edge_ids: [],
};

test("back-to-back edits see current state before React renders", () => {
  const { result } = renderHook(useDiagramState);
  act(() => {
    result.current.addStep();
    result.current.addStep();
  });
  expect(result.current.graph.nodes).toHaveLength(2);
  expect(result.current.graph.revision).toBe(2);
  act(() => {
    expect(result.current.applyAgentChanges(patch).error).toContain("canvas changed");
  });
  expect(result.current.graph.nodes).toHaveLength(2);
  expect(result.current.graph.revision).toBe(2);
});

test("deletion removes incident edges; undo restores them with a fresh revision", () => {
  const { result } = renderHook(useDiagramState);
  act(() => {
    result.current.applyAgentChanges(patch);
  });
  act(() => result.current.changeNodes([{ type: "select", id: "a", selected: true }]));
  act(() => result.current.deleteSelection());
  expect(result.current.graph.nodes.map((node) => node.id)).toEqual(["b"]);
  expect(result.current.graph.edges).toEqual([]);
  const deletedRevision = result.current.graph.revision;
  act(() => result.current.undo());
  expect(result.current.graph.nodes.map((node) => node.id)).toEqual(["a", "b"]);
  expect(result.current.graph.edges).toHaveLength(1);
  expect(result.current.graph.revision).toBe(deletedRevision + 1);
  act(() => result.current.undo());
  expect(result.current.graph.nodes).toEqual([]);
  expect(result.current.canUndo).toBe(false);
});

test("invalid and empty canvas interactions preserve revision and undo history", () => {
  const { result } = renderHook(useDiagramState);
  act(() => {
    result.current.applyAgentChanges(patch);
  });
  act(() => {
    result.current.connect({ source: "a", target: "b", sourceHandle: null, targetHandle: null });
    result.current.connect({
      source: "a",
      target: "missing",
      sourceHandle: null,
      targetHandle: null,
    });
  });
  act(() => {
    result.current.changeNodes([{ type: "select", id: "missing", selected: true }]);
    result.current.changeEdges([{ type: "remove", id: "missing" }]);
    result.current.deleteSelection();
  });
  expect(result.current.graph.revision).toBe(1);
  expect(result.current.graph.edges).toHaveLength(1);
  act(() => result.current.undo());
  expect(result.current.graph.nodes).toEqual([]);
});
