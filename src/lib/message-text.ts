/** Tool-only events can omit content even though the SDK types it as a string. */
export function visibleMessageText(content: unknown): string | null {
  return typeof content === "string" && content.trim() ? content : null;
}
