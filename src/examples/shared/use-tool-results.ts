"use client";

import { useEffect, useReducer, useState } from "react";
import { activeTools, type TimelineItem, type ToolItem } from "@cadenya/widgets-ui-react";
import { ToolResultQueue, type SubmitToolResult } from "./tool-result-queue";
import { useMountedRef } from "./use-mounted-ref";

export type ToolIdentity = { id: string; externalId: string };
export type BrowserTool = ToolIdentity & {
  execute: (item: ToolItem) => string;
  onDelivered?: (content: string) => void;
};

export function matchesTool(item: ToolItem, tool: ToolIdentity): boolean {
  return item.tool?.id === tool.id || item.tool?.externalId === tool.externalId;
}

/** Execute only live calls after history loads; retry delivery without replaying effects. */
export function useToolResults({
  conversationId,
  timeline,
  loading,
  tools,
  submit,
}: {
  conversationId: string | null;
  timeline: TimelineItem[];
  loading: boolean;
  tools: BrowserTool[];
  submit: SubmitToolResult;
}) {
  const [queue] = useState(() => new ToolResultQueue());
  const [, refresh] = useReducer((revision: number) => revision + 1, 0);
  const mounted = useMountedRef();

  useEffect(() => {
    if (!conversationId || loading) return;
    for (const item of activeTools(timeline)) {
      if (item.status !== "running") continue;
      const tool = tools.find((candidate) => matchesTool(item, candidate));
      if (!tool) continue;
      // execute() claims each ID synchronously, so stream replays and Strict Mode
      // cannot repeat the local mutation while result delivery is in flight.
      void queue
        .execute(conversationId, item.toolCallId, () => tool.execute(item), submit)
        .then((outcome) => {
          if (!mounted.current) return;
          if (outcome.status === "delivered") tool.onDelivered?.(outcome.content);
          if (outcome.status !== "skipped") refresh();
        });
    }
  }, [conversationId, timeline, loading, tools, submit, queue, mounted]);

  const failedCalls =
    !conversationId || loading
      ? []
      : activeTools(timeline).filter(
          (item) => item.status === "running" && queue.isFailed(conversationId, item.toolCallId),
        );

  async function retry() {
    if (!conversationId) return;
    for (const item of failedCalls) {
      const outcome = await queue.retry(conversationId, item.toolCallId, submit);
      if (!mounted.current) return;
      if (outcome.status === "delivered")
        tools.find((tool) => matchesTool(item, tool))?.onDelivered?.(outcome.content);
      refresh();
    }
  }

  return { hasFailures: failedCalls.length > 0, retry };
}
