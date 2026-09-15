"use client";

import { useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { DiagramCanvas } from "./diagram-canvas";
import { DiagramConversation } from "./diagram-conversation";
import { useDiagramState } from "./use-diagram-state";

export function DiagramBuilder() {
  const [round, setRound] = useState(0);
  // Reset the canvas, conversation, undo history, and tool receipts as one unit.
  return (
    <ReactFlowProvider key={round}>
      <DiagramEditor onReset={() => setRound((value) => value + 1)} />
    </ReactFlowProvider>
  );
}

function DiagramEditor({ onReset }: { onReset: () => void }) {
  const diagram = useDiagramState();
  return (
    <div className="diagram-layout">
      <section id="diagram-workspace" className="diagram-workspace" aria-label="Diagram workspace">
        <div className="diagram-toolbar">
          <div>
            <span className="emoji-eyebrow">BUILD TOGETHER</span>
            <h2>From idea to flow</h2>
          </div>
          <div className="diagram-actions">
            <button disabled={!diagram.canAddStep} onClick={diagram.addStep}>
              Add step
            </button>
            <button disabled={!diagram.canUndo} onClick={diagram.undo}>
              Undo
            </button>
            <button onClick={onReset}>New diagram</button>
          </div>
        </div>
        <a className="diagram-mobile-link" href="#diagram-conversation">
          Go to conversation ↓
        </a>
        <DiagramCanvas
          graph={diagram.graph}
          selectedEdgeIds={diagram.selectedEdgeIds}
          fitVersion={diagram.fitVersion}
          onNodesChange={diagram.changeNodes}
          onEdgesChange={diagram.changeEdges}
          onConnect={diagram.connect}
        />
        <div className="diagram-selection">
          {diagram.selectedNode ? (
            <>
              <label>
                Selected step{" "}
                <input
                  aria-label="Selected node label"
                  value={diagram.selectedNode.label}
                  maxLength={160}
                  onChange={(event) => diagram.renameSelection(event.target.value)}
                />
              </label>
              <span>
                {diagram.graph.selectedNodeIds.length} selected · Ask the agent to change “this
                step”.
              </span>
            </>
          ) : (
            <span>
              Select a node to rename it or give the agent context. Drag handles or tap two handles
              to connect steps.
            </span>
          )}
          {diagram.hasSelection && (
            <button className="diagram-delete" onClick={diagram.deleteSelection}>
              Delete selection
            </button>
          )}
        </div>
      </section>
      <DiagramConversation
        state={diagram.graph}
        readState={diagram.read}
        applyChanges={diagram.applyAgentChanges}
      />
    </div>
  );
}
