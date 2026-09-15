import type { NodeChange } from "@xyflow/react";
import { MAX_DIAGRAM_EDGES, type DiagramState } from "./diagram-state";

/** Convert canvas notifications into a domain edit; selection does not enter undo history. */
export function applyNodeInteractions(state: DiagramState, changes: NodeChange[]) {
  let { nodes, edges, selectedNodeIds } = state;
  let changed = false;
  let recordUndo = false;

  for (const change of changes) {
    if (change.type === "position" && change.position) {
      const position = change.position;
      const moved = nodes.some(
        (node) => node.id === change.id && (node.x !== position.x || node.y !== position.y),
      );
      if (!moved) continue;
      nodes = nodes.map((node) =>
        node.id === change.id ? { ...node, x: position.x, y: position.y } : node,
      );
      changed = recordUndo = true;
    } else if (change.type === "select") {
      if (!nodes.some((node) => node.id === change.id)) continue;
      if (selectedNodeIds.includes(change.id) === change.selected) continue;
      selectedNodeIds = change.selected
        ? [...selectedNodeIds, change.id]
        : selectedNodeIds.filter((id) => id !== change.id);
      changed = true;
    } else if (change.type === "remove") {
      if (!nodes.some((node) => node.id === change.id)) continue;
      nodes = nodes.filter((node) => node.id !== change.id);
      edges = edges.filter((edge) => edge.source !== change.id && edge.target !== change.id);
      selectedNodeIds = selectedNodeIds.filter((id) => id !== change.id);
      changed = recordUndo = true;
    }
  }

  return { state: changed ? { ...state, nodes, edges, selectedNodeIds } : state, recordUndo };
}

export function connectNodes(
  state: DiagramState,
  source: string,
  target: string,
  edgeId: string,
): DiagramState {
  if (state.edges.length >= MAX_DIAGRAM_EDGES) return state;
  if (
    !state.nodes.some((node) => node.id === source) ||
    !state.nodes.some((node) => node.id === target)
  )
    return state;
  if (state.edges.some((edge) => edge.source === source && edge.target === target)) return state;
  return { ...state, edges: [...state.edges, { id: edgeId, source, target, label: "" }] };
}

export function removeSelection(state: DiagramState, selectedEdgeIds: string[]): DiagramState {
  if (state.selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) return state;
  const removedNodes = new Set(state.selectedNodeIds);
  const removedEdges = new Set(selectedEdgeIds);
  return {
    ...state,
    nodes: state.nodes.filter((node) => !removedNodes.has(node.id)),
    edges: state.edges.filter(
      (edge) =>
        !removedNodes.has(edge.source) &&
        !removedNodes.has(edge.target) &&
        !removedEdges.has(edge.id),
    ),
    selectedNodeIds: [],
  };
}
