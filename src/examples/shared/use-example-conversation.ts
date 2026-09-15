"use client";

import { useRef, useState } from "react";
import { awaitingReply, useConversation, useConversations } from "@cadenya/widgets-ui-react";
import { useMountedRef } from "./use-mounted-ref";

/** Owns selection and create-or-send behavior; domain state stays in the example. */
export function useExampleConversation() {
  const list = useConversations();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const conversation = useConversation(conversationId);
  const [requesting, setRequesting] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const pending = useRef<Promise<void> | null>(null);
  const selectionVersion = useRef(0);
  const mounted = useMountedRef();

  function select(id: string | null) {
    selectionVersion.current += 1;
    setConversationId(id);
    setSendError(null);
  }

  function send(message: string): Promise<void> {
    if (pending.current) return pending.current;
    const version = selectionVersion.current;
    setRequesting(true);
    setSendError(null);
    const request = async () => {
      try {
        if (conversationId) await conversation.send(message);
        else {
          const created = await list.create(message);
          // A slow create must not steal selection after the visitor switches chats.
          if (mounted.current && version === selectionVersion.current)
            setConversationId(created.id);
        }
      } catch (error) {
        if (mounted.current && version === selectionVersion.current) {
          setSendError(
            error instanceof Error ? error.message : "Could not send your message. Please retry.",
          );
        }
        // Composer preserves its draft when onSend rejects.
        throw error;
      } finally {
        pending.current = null;
        if (mounted.current) setRequesting(false);
      }
    };
    // Claim the operation before user/SDK code can synchronously throw.
    pending.current = Promise.resolve().then(request);
    return pending.current;
  }

  async function sendFromButton(message: string) {
    try {
      await send(message);
    } catch {
      // Unlike Composer, shortcut buttons have no promise-aware error UI.
      // send() already exposed the failure through this hook's error field.
    }
  }

  return {
    conversationId,
    conversation,
    list,
    select,
    send,
    sendFromButton,
    busy:
      requesting ||
      conversation.loading ||
      conversation.sending ||
      awaitingReply(conversation.timeline),
    error: sendError ?? list.error ?? conversation.error,
  };
}
