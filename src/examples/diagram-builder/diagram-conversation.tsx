"use client";

import { Composer, MessageThread, ToolActivity } from "@cadenya/widgets-ui-react";
import { PromptSuggestions } from "../shared/prompt-suggestions";
import { useExampleConversation } from "../shared/use-example-conversation";
import { useToolResults } from "../shared/use-tool-results";
import type { DiagramEditResult, DiagramState } from "./diagram-state";
import resources from "./cadenya/diagram-resources.json";

const STARTER_PROMPTS = [
  "Map out a customer onboarding workflow",
  "Build a bug triage flow with an escalation path",
];
type DiagramConversationProps = {
  state: DiagramState;
  readState: () => DiagramState;
  applyChanges: (input: unknown) => DiagramEditResult;
};

export function DiagramConversation({ state, readState, applyChanges }: DiagramConversationProps) {
  const chat = useExampleConversation();
  const { conversation, conversationId } = chat;
  const delivery = useToolResults({
    conversationId,
    timeline: conversation.timeline,
    loading: conversation.loading,
    submit: conversation.setToolCallContent,
    tools: [
      {
        id: resources.get_diagram_state,
        externalId: "get_diagram_state",
        execute: () => JSON.stringify(readState()),
      },
      {
        id: resources.apply_diagram_changes,
        externalId: "apply_diagram_changes",
        execute: (item) => JSON.stringify(applyChanges(item.args)),
      },
    ],
  });

  return (
    <aside id="diagram-conversation" className="diagram-chat" aria-label="Diagram conversation">
      <div className="conversation-title">
        Your diagram partner
        <a className="diagram-mobile-link" href="#diagram-workspace">
          Back to canvas ↑
        </a>
      </div>
      <div className={`diagram-messages${conversationId ? " library-thread" : ""}`}>
        {conversationId ? (
          <MessageThread
            key={conversationId}
            timeline={conversation.timeline}
            loading={conversation.loading}
            renderTool={(item) => (
              <ToolActivity
                item={item}
                onApprove={conversation.approveToolCall}
                onDeny={conversation.denyToolCall}
              />
            )}
          />
        ) : (
          <div className="diagram-welcome">
            <h3>Describe it. Shape it together.</h3>
            <p>I can build a flow, add a branch, or work on your selected step.</p>
            <PromptSuggestions
              prompts={STARTER_PROMPTS}
              disabled={chat.busy}
              onChoose={chat.sendFromButton}
            />
          </div>
        )}
      </div>
      <div className="conversation-status">
        {chat.error && <p role="alert">{chat.error}</p>}
        {delivery.hasFailures && (
          <p role="alert">
            Could not send the tool result.{" "}
            <button
              onClick={() => {
                void delivery.retry();
              }}
            >
              Retry result
            </button>
          </p>
        )}
      </div>
      <Composer
        variant="pill"
        onSend={chat.send}
        disabled={chat.busy}
        placeholder="Describe a flow or ask to change the selection…"
      />
      <details className="diagram-details">
        <summary>Live canvas state · revision {state.revision}</summary>
        <pre>{JSON.stringify(state, null, 2)}</pre>
      </details>
    </aside>
  );
}
