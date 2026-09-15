import Markdown from "react-markdown";
import { ToolActivity, type TimelineItem } from "@cadenya/widgets-ui-react";
import { visibleMessageText } from "@/lib/message-text";

function ActivityItem({ item }: { item: TimelineItem }) {
  if (item.kind === "tool") return <ToolActivity item={item} />;
  if (item.kind === "notice") return <p role="alert">{item.message || item.notice}</p>;
  if (item.role !== "assistant") return null;
  const content = visibleMessageText(item.content);
  return content ? (
    <div className="chess-message">
      <Markdown>{content}</Markdown>
    </div>
  ) : null;
}

export function ChessActivity({ timeline }: { timeline: TimelineItem[] }) {
  // Reverse a copy; the SDK timeline remains chronological for its state helpers.
  return (
    <div className="chess-activity" aria-label="Chess agent activity">
      {[...timeline].reverse().map((item) => (
        <ActivityItem key={item.kind === "tool" ? item.toolCallId : item.id} item={item} />
      ))}
    </div>
  );
}
