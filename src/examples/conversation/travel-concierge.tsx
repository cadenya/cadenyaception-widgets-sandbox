"use client";

import dynamic from "next/dynamic";
import {
  Composer,
  ConversationList,
  MessageThread,
  ToolActivity,
  activeTools,
  type ToolItem,
} from "@cadenya/widgets-ui-react";
import { useExampleConversation } from "../shared/use-example-conversation";
import { matchesTool } from "../shared/use-tool-results";
import { PromptSuggestions } from "../shared/prompt-suggestions";
import { EmojiPanel } from "./emoji-panel";
import { TravelCard } from "./travel-card";
import { TRAVEL_TOOLS } from "./travel-tools";
import { useEmojiTools } from "./use-emoji-tools";

// JSON Schema rendering is a large dependency; ordinary chats should not load it.
const SchemaFormTool = dynamic(
  () => import("./schema-form-tool").then((module) => module.SchemaFormTool),
  { ssr: false },
);
const STARTER_PROMPTS = [
  "Plan my trip using a form",
  "Show me three relaxing weekend destinations",
  "Suggest a trip inspired by my page emoji",
];

export function TravelConcierge() {
  const chat = useExampleConversation();
  const { conversation, conversationId, list } = chat;
  const emoji = useEmojiTools(conversationId, conversation);
  const activeCalls = activeTools(conversation.timeline);
  const waitingForForm = activeCalls.some(
    (item) => item.status === "running" && matchesTool(item, TRAVEL_TOOLS.form),
  );

  function renderTool(item: ToolItem) {
    if (matchesTool(item, TRAVEL_TOOLS.form)) {
      return (
        <SchemaFormTool
          item={item}
          active={activeCalls.some((call) => call.toolCallId === item.toolCallId)}
          submit={conversation.setToolCallContent}
        />
      );
    }
    if (matchesTool(item, TRAVEL_TOOLS.card)) return <TravelCard args={item.args} />;
    return (
      <ToolActivity
        item={item}
        onApprove={conversation.approveToolCall}
        onDeny={conversation.denyToolCall}
      />
    );
  }

  return (
    <div className="resource-panel portal-panel">
      <aside className="conversation-sidebar">
        <ConversationList
          conversations={list.conversations}
          selectedId={conversationId}
          onSelect={chat.select}
          loading={list.loading}
        />
      </aside>
      <div className="conversation-main">
        <div className="conversation-title">
          {conversationId ? "Your conversation" : "Your travel concierge"}
        </div>
        {chat.error && (
          <p className="conversation-error" role="alert">
            {chat.error}
          </p>
        )}
        <div
          className={`resource-thread${conversationId ? " library-thread" : ""}${waitingForForm ? " is-waiting-for-form" : ""}`}
          aria-label="Message history"
          aria-busy={conversation.loading}
        >
          {conversationId ? (
            <MessageThread
              key={conversationId}
              timeline={conversation.timeline}
              loading={conversation.loading}
              renderTool={renderTool}
            />
          ) : (
            <div className="welcome">
              <h2>Where would you like to go?</h2>
              <p>Find your next destination and shape a trip around you.</p>
              <PromptSuggestions
                prompts={STARTER_PROMPTS}
                disabled={chat.busy}
                onChoose={chat.sendFromButton}
              />
            </div>
          )}
        </div>
        {waitingForForm && (
          <p className="conversation-status" role="status">
            Complete or cancel the form to continue.
          </p>
        )}
        <Composer
          variant="pill"
          onSend={chat.send}
          disabled={chat.busy}
          placeholder="Tell me about your next trip…"
        />
      </div>
      <EmojiPanel
        emoji={emoji.emoji}
        shuffleCallId={emoji.shuffleCallId}
        lastShared={emoji.lastShared}
        busy={chat.busy}
        deliveryFailed={emoji.delivery.hasFailures}
        onShuffle={emoji.shuffle}
        onAsk={chat.sendFromButton}
        onRetry={emoji.delivery.retry}
      />
    </div>
  );
}
