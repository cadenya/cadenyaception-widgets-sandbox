# Reading and extending the examples

Each demo shows an agent working with browser state. Start at `travel-concierge.tsx`, `chess-game.tsx`, or `diagram-builder.tsx`, then follow the domain hook and tool bindings. The entry component composes the UI; the hook coordinates interaction; domain helpers validate or mutate domain state. Setup scripts create the Cadenya resources separately from the browser. See the [root setup guide](../../README.md#run-locally) to run the examples and the [Cadenya documentation](https://cadenya.com/docs) for agents, widgets, and tools.

## Shared code

Only behavior used across examples lives in `shared/`:

| File                          | Contract                                                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `use-example-conversation.ts` | Select a conversation, create it on the first send, and expose busy/error state.                                        |
| `tool-result-queue.ts`        | Execute a synchronous local action once per conversation/tool-call ID and retain its exact result for delivery retries. |
| `use-tool-results.ts`         | Adapt live timeline calls to the result queue and expose failed deliveries for retry.                                   |
| `use-mounted-ref.ts`          | Guard completion callbacks after the example unmounts.                                                                  |
| `prompt-suggestions.tsx`      | Render shortcut prompts whose owner handles sending and errors.                                                         |

Chess rules, graph revisions, forms, and emoji behavior live in their respective example folders.

## Conversation lifecycle

The shared conversation hook uses the widget library's `useConversations` and `useConversation` directly. Its additional responsibility is create-or-send coordination: concurrent sends share one pending operation, and a slow create cannot replace a conversation the visitor selected in the meantime.

`send()` rejects on failure so `Composer` retains the draft. Shortcut buttons use `sendFromButton()`, which exposes the same error in the example's alert without leaving an unhandled promise. Domain state remains independent of conversation selection: switching a travel conversation does not reset the page emoji. Starting a new chess game or diagram deliberately remounts both its domain state and conversation.

## Tool execution and retries

A browser tool binding contains its canonical ID, external ID, and a synchronous `execute` callback returning a string result. It can also receive an `onDelivered` callback. The result queue depends on a small `submit(toolCallId, content)` function, rather than the whole widget client.

Results use the [bare tool result API](https://cadenya.com/docs/api-reference/objectiveservice/set-a-bare-tool-calls-content) through the widget library. The flow is:

1. Wait until history has loaded, then inspect only running tools in the active timeline tail. Completed tools and calls before a message or terminal notice are not executed.
2. Claim the conversation/tool-call ID **before** running its local action. This prevents stream replays and React Strict Mode effects from repeating it during this mount.
3. Capture the result and submit it. An execution exception becomes an error result; a delivery failure becomes a retryable record.
4. On explicit retry, send the captured string again. Do not reread state or repeat the action: the visitor may have changed the board, diagram, or emoji meanwhile.

The adapter exposes explicit retries that preserve the original tool result. The records are in memory for one mounted example, scoped by conversation. They do not promise exactly-once behavior across reloads, multiple browsers, or server restarts. Durable business actions need server-side idempotency and persistence.

Presentation tools follow their own contracts. Travel cards are acknowledged by their bare tool configuration and rendered from arguments. Forms wait for a visitor response and own submission state. Neither belongs in the automatic browser-state executor.

## Adding a behavior

Define the domain operation and validate untrusted arguments at its boundary. Keep failed operations atomic. Add a focused test for the invariant, then register a tool binding that calls the operation and serializes its result. Keep rendering in a component that takes explicit data and callbacks. If the agent-facing contract changes, update the JSON tool definition, prompt, and setup resources together.

Run `npm run format`, `npm test`, `npm run typecheck`, and `npm run build` from the repository root. Tests use Node for pure helpers and Vitest/jsdom for lifecycle and interactive form behavior. Keep tests next to the behavior they protect.
