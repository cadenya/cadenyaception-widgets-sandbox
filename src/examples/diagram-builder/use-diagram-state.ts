"use client";

import { useRef, useState } from "react";
import type { Connection, EdgeChange, NodeChange } from "@xyflow/react";
import {
  applyDiagramPatch,
  emptyDiagram,
  MAX_DIAGRAM_NODES,
  type DiagramState,
  type DiagramEditResult,
} from "./diagram-state";
import { applyNodeInteractions, connectNodes, removeSelection } from "./diagram-interactions";

const UNDO_LIMIT = 30;

/** All local and agent edits commit through one revision/undo boundary. */
export function useDiagramState() {
  const [graph, setGraph] = useState<DiagramState>(emptyDiagram);
  const current = useRef(graph);
  const history = useRef<DiagramState[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [fitVersion, setFitVersion] = useState(0);

  function commit(next: DiagramState, recordUndo = true) {
    if (recordUndo)
      history.current = [...history.current.slice(-(UNDO_LIMIT - 1)), current.current];
    // Synchronous tool calls must see each other's edits before React re-renders.
    current.current = next;
    setGraph(next);
  }

  function edit(next: DiagramState, recordUndo = true) {
    if (next === current.current) return;
    commit({ ...next, revision: current.current.revision + 1 }, recordUndo);
  }

  function applyAgentChanges(input: unknown): DiagramEditResult {
    const result = applyDiagramPatch(current.current, input);
    if (result.error) return { error: result.error, state: result.state };
    commit(result.state);
    setFitVersion((value) => value + 1);
    return { ok: true, state: result.state };
  }

  function changeNodes(changes: NodeChange[]) {
    const result = applyNodeInteractions(current.current, changes);
    edit(result.state, result.recordUndo);
  }

  function changeEdges(changes: EdgeChange[]) {
    setSelectedEdgeIds((previous) => {
      const selected = new Set(previous);
      for (const change of changes) {
        if (change.type === "select") {
          if (change.selected) selected.add(change.id);
          else selected.delete(change.id);
        } else if (change.type === "remove") selected.delete(change.id);
      }
      return [...selected];
    });
    const removed = new Set(
      changes.filter((change) => change.type === "remove").map((change) => change.id),
    );
    const state = current.current;
    if (state.edges.some((edge) => removed.has(edge.id))) {
      edit({ ...state, edges: state.edges.filter((edge) => !removed.has(edge.id)) });
    }
  }

  function connect(connection: Connection) {
    edit(connectNodes(current.current, connection.source, connection.target, crypto.randomUUID()));
  }

  function addStep() {
    const state = current.current;
    if (state.nodes.length >= MAX_DIAGRAM_NODES) return;
    edit({
      ...state,
      nodes: [
        ...state.nodes,
        {
          id: crypto.randomUUID(),
          label: "New step",
          kind: "step",
          x: (state.nodes.length % 3) * 240,
          y: Math.floor(state.nodes.length / 3) * 140,
        },
      ],
    });
    setFitVersion((value) => value + 1);
  }

  function undo() {
    const previous = history.current.pop();
    if (!previous) return;
    // Undo restores content, never an old revision that an agent could mistake for current.
    commit({ ...previous, revision: current.current.revision + 1 }, false);
    setSelectedEdgeIds([]);
  }

  function deleteSelection() {
    edit(removeSelection(current.current, selectedEdgeIds));
    setSelectedEdgeIds([]);
  }

  const selectedNode = graph.nodes.find((node) => graph.selectedNodeIds.includes(node.id));
  function renameSelection(label: string) {
    if (!selectedNode) return;
    edit({
      ...current.current,
      nodes: current.current.nodes.map((node) =>
        node.id === selectedNode.id ? { ...node, label } : node,
      ),
    });
  }

  return {
    graph,
    selectedEdgeIds,
    selectedNode,
    fitVersion,
    canUndo: history.current.length > 0,
    canAddStep: graph.nodes.length < MAX_DIAGRAM_NODES,
    hasSelection: graph.selectedNodeIds.length > 0 || selectedEdgeIds.length > 0,
    read: () => current.current,
    applyAgentChanges,
    changeNodes,
    changeEdges,
    connect,
    addStep,
    undo,
    deleteSelection,
    renameSelection,
  };
}
