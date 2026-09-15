"use client";

import { useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  useReactFlow,
  type Node,
  type NodeProps,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import type { DiagramState, DiagramNode } from "./diagram-state";
import "@xyflow/react/dist/style.css";

type CanvasNode = Node<Pick<DiagramNode, "label" | "kind">, "diagram">;
type DiagramCanvasProps = {
  graph: DiagramState;
  selectedEdgeIds: string[];
  fitVersion: number;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
};

function DiagramNodeView({ data }: NodeProps<CanvasNode>) {
  return (
    <div className={`diagram-node diagram-node-${data.kind}`}>
      <Handle type="target" position={Position.Top} />
      <span>{data.kind}</span>
      <strong>{data.label}</strong>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
const NODE_TYPES = { diagram: DiagramNodeView };

export function DiagramCanvas({
  graph,
  selectedEdgeIds,
  fitVersion,
  onNodesChange,
  onEdgesChange,
  onConnect,
}: DiagramCanvasProps) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    if (!fitVersion) return;
    // React Flow needs a layout pass to measure newly mounted nodes before fitting.
    const timer = setTimeout(() => {
      void fitView({ padding: 0.25, duration: 300 });
    }, 150);
    return () => clearTimeout(timer);
  }, [fitVersion, fitView]);

  const nodes: CanvasNode[] = graph.nodes.map((node) => ({
    id: node.id,
    type: "diagram",
    position: { x: node.x, y: node.y },
    data: { label: node.label, kind: node.kind },
    selected: graph.selectedNodeIds.includes(node.id),
    width: 180,
    height: 64,
  }));
  const edges = graph.edges.map((edge) => ({
    ...edge,
    selected: selectedEdgeIds.includes(edge.id),
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: "#6c86a5", strokeWidth: 2 },
  }));

  return (
    <div className="diagram-canvas">
      <ReactFlow<CanvasNode>
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        minZoom={0.15}
        maxZoom={2}
        connectOnClick
        deleteKeyCode={["Backspace", "Delete"]}
      >
        <Background gap={20} color="#d5deea" />
        <Controls />
        <MiniMap pannable zoomable nodeColor="#8aa5ce" />
      </ReactFlow>
      {!graph.nodes.length && (
        <div className="diagram-empty">
          <h3>What should we map out?</h3>
          <p>Describe a process to the agent, or add your first step.</p>
        </div>
      )}
    </div>
  );
}
