import test from "node:test";
import assert from "node:assert/strict";

test("tool-only messages with omitted content do not crash rendering; later streamed text remains visible", async () => {
  const { applyEvents } = await import("@cadenya/widgets-ui-react");
  const { visibleMessageText } = await import("./message-text.ts");
  // Actual wire shape: assistantMessage may omit content for a tool-only turn.
  const event = JSON.parse('{"id":"event-tool-only","type":"assistantMessage","createdAt":"2026-09-09T02:00:00Z","assistantMessage":{}}');
  const timeline = applyEvents([], [event]);
  const message = timeline[0];
  assert.equal(message.kind, "message");
  if (message.kind !== "message") throw new Error("Expected message");
  assert.equal(visibleMessageText(message.content), null);
  for (const empty of [undefined, null, "", "  \n  "]) assert.equal(visibleMessageText(empty), null);
  const updated = applyEvents(timeline, [{ ...event, assistantMessage: { content: "Here are your agents." } }]);
  assert.equal(updated.length, 1);
  assert.equal(updated[0].kind === "message" && visibleMessageText(updated[0].content), "Here are your agents.");
});
