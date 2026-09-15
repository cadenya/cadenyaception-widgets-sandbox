export type SubmitToolResult = (toolCallId: string, content: string) => Promise<void>;

export type DeliveryOutcome =
  { status: "delivered"; content: string } | { status: "failed" } | { status: "skipped" };

type Delivery = {
  content: string;
  status: "sending" | "sent" | "failed";
};

/**
 * Separates a local side effect from delivery of its result. A lost HTTP response
 * must never move a chess piece, edit a diagram, or shuffle an emoji twice.
 * Records live for one mounted example and are isolated by conversation.
 */
export class ToolResultQueue {
  private readonly conversations = new Map<string, Map<string, Delivery>>();

  async execute(
    conversationId: string,
    toolCallId: string,
    createResult: () => string,
    submit: SubmitToolResult,
  ): Promise<DeliveryOutcome> {
    let calls = this.conversations.get(conversationId);
    if (!calls) {
      calls = new Map();
      this.conversations.set(conversationId, calls);
    }
    if (calls.has(toolCallId)) return { status: "skipped" };

    const delivery: Delivery = { content: "", status: "sending" };
    // Claim the invocation before running user code, including synchronous code.
    calls.set(toolCallId, delivery);
    try {
      delivery.content = createResult();
    } catch (error) {
      delivery.content = JSON.stringify({
        error: error instanceof Error ? error.message : "The page tool failed.",
      });
    }
    return this.deliver(toolCallId, delivery, submit);
  }

  isFailed(conversationId: string, toolCallId: string): boolean {
    return this.conversations.get(conversationId)?.get(toolCallId)?.status === "failed";
  }

  async retry(
    conversationId: string,
    toolCallId: string,
    submit: SubmitToolResult,
  ): Promise<DeliveryOutcome> {
    const delivery = this.conversations.get(conversationId)?.get(toolCallId);
    if (delivery?.status !== "failed") return { status: "skipped" };
    delivery.status = "sending";
    return this.deliver(toolCallId, delivery, submit);
  }

  private async deliver(
    toolCallId: string,
    delivery: Delivery,
    submit: SubmitToolResult,
  ): Promise<DeliveryOutcome> {
    try {
      await submit(toolCallId, delivery.content);
      delivery.status = "sent";
      return { status: "delivered", content: delivery.content };
    } catch {
      delivery.status = "failed";
      return { status: "failed" };
    }
  }
}
