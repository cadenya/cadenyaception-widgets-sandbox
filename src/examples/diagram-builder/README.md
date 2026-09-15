# Diagram builder example

A React Flow canvas paired with a dedicated Cadenya conversation. The agent reads the canvas through `get_diagram_state` and edits it atomically through `apply_diagram_changes`.

| File                                            | Responsibility                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `diagram-builder.tsx`                           | Compose the toolbar, selection editor, canvas, and conversation; own reset.     |
| `diagram-canvas.tsx`                            | Adapt domain nodes and edges to React Flow and render the canvas.               |
| `diagram-conversation.tsx`                      | Bind the two browser tools to conversation UI.                                  |
| `use-diagram-state.ts`                          | Commit edits through one revision and undo boundary.                            |
| `diagram-state.ts`                              | Define the domain schema and apply validated, atomic agent patches.             |
| `diagram-interactions.ts`                       | Convert canvas interactions into domain edits without React state or transport. |
| `diagram.test.ts`, `use-diagram-state.test.tsx` | Test patch validation, batched edits, deletion, stale revisions, and undo.      |
| `cadenya/system-prompt.txt`, `cadenya/*.json`   | Sequential editing instructions and bare tool contracts.                        |
| `setup.mjs`                                     | Provision the example and copy the travel widget's origin allowlist.            |

## How it works

Open [/diagram-builder](https://widgets-demo.cadenya.com/diagram-builder) to create a diagram with an agent.
Try **Map out a customer onboarding workflow**, then select and rename a node,
and ask **Add an approval step after this, including a rejection path**. You can
also drag nodes, connect their handles, delete selections, add steps, and undo
changes. The canvas and chat survive tab switches; New diagram and page reload
start fresh. This is a visual design canvas, not an executable workflow deployment.

On phones and tablets the canvas and conversation stack vertically, with links to jump between them. Touch users can tap handles to connect nodes and use **Delete selection** without a keyboard; **Undo** restores removed nodes and connections. Canvas controls and editable fields have larger touch targets, and the minimap is hidden to leave room for the diagram.

The agent is instructed to add one node per tool call, wait for the result, and send a short conversation message before the next edit. Connections to existing nodes are included with each new node so the canvas stays valid as it grows. It continues through the requested diagram without asking for approval between steps. Start a **new diagram** after a prompt update; existing conversations retain their original instructions.

`npm run setup:diagram` provisions an isolated agent/widget and two bare tools:
`get_diagram_state` reads nodes, edges, positions, selected node IDs and a revision;
`apply_diagram_changes` atomically upserts/removes nodes and edges against that
revision. Stale edits, invalid shapes, duplicate patch IDs and dangling edges are
rejected. Removing a node cleans its edges and selection. Retry of tool-result
submission reuses the captured response rather than applying changes twice.
The demo caps graphs at
50 nodes and 100 edges. Source uses `@xyflow/react`; attribution remains visible.

## Setup

Follow the [local setup instructions](../../../README.md#run-locally). To update just this example after setting up travel:

```sh
npm run setup:diagram
```

Setup synchronizes the two tool definitions, agent prompt, selected model, and optional Faker tool set. It copies the travel widget's origin allowlist and writes resource IDs to `cadenya/diagram-resources.json`. See the [tool sets guide](https://cadenya.com/docs/guides/the-basics/tool-sets) and [widgets guide](https://cadenya.com/docs/guides/the-basics/widgets) for these resources.

## Fictional demo data

With the [optional Faker integration](../../../README.md#optional-sample-data) configured, try **Create a sample org chart with five fake employees**. The agent discovers relevant Faker options, generates a small fictional dataset, and uses the existing canvas tools to display it. Ordinary diagram requests do not need Faker.

## State and delivery boundaries

`useDiagramState` is the single writer for the graph. Each accepted edit advances its revision; selection changes also advance it so the agent cannot act on stale selection context. Selection does not add an undo entry. Undo retains up to 30 previous graph snapshots and restores content with a **new** revision. Consecutive edits read a synchronously updated reference, so an agent's next tool call sees the preceding edit even before React renders.

`diagram-state.ts` has no dependency on React, React Flow, or Cadenya. `diagram-interactions.ts` imports only React Flow's event types. The canvas receives graph data and callbacks; the conversation receives only a state reader and an edit operation. Add a domain rule at the state boundary, then test it there. Do not make the canvas or a tool renderer another graph owner.

The [shared result queue](../README.md) separates an accepted edit from delivery of its result. A failed delivery retries the original response, preserving the original revision and avoiding a second edit. Reset remounts the entire diagram, including its conversation and pending-result records. Completed graph state is local to this page and is not reconstructed from conversation history after reload.
