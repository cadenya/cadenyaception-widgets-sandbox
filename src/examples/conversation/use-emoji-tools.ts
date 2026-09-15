"use client";

import { useCallback, useRef, useState } from "react";
import type { useConversation } from "@cadenya/widgets-ui-react";
import { useToolResults } from "../shared/use-tool-results";
import { TRAVEL_TOOLS } from "./travel-tools";

const EMOJI_CHOICES = ["🌵", "🦊", "🐙", "🍋", "🚀", "🦋", "🍄", "🪁", "🐳", "🌻", "🪐", "🥑"];

export function useEmojiTools(
  conversationId: string | null,
  conversation: Pick<
    ReturnType<typeof useConversation>,
    "timeline" | "loading" | "setToolCallContent"
  >,
) {
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[0]);
  const currentEmoji = useRef(emoji);
  const [shuffleCallId, setShuffleCallId] = useState<string | null>(null);
  const [lastShared, setLastShared] = useState<string | null>(null);

  const shuffle = useCallback(() => {
    const choices = EMOJI_CHOICES.filter((value) => value !== currentEmoji.current);
    const next = choices[Math.floor(Math.random() * choices.length)];
    // Tool calls can arrive together before React renders the first update.
    currentEmoji.current = next;
    setEmoji(next);
    return next;
  }, []);

  const delivery = useToolResults({
    conversationId,
    timeline: conversation.timeline,
    loading: conversation.loading,
    submit: conversation.setToolCallContent,
    tools: [
      {
        ...TRAVEL_TOOLS.readEmoji,
        execute: () => currentEmoji.current,
        onDelivered: setLastShared,
      },
      {
        ...TRAVEL_TOOLS.shuffleEmoji,
        execute: (item) => {
          setShuffleCallId(item.toolCallId);
          return shuffle();
        },
        onDelivered: setLastShared,
      },
    ],
  });

  return { emoji, shuffle, shuffleCallId, lastShared, delivery };
}
