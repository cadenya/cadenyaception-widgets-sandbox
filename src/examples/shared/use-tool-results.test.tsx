import { StrictMode } from "react";
import { cleanup, renderHook, waitFor, act } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import type { TimelineItem, ToolItem } from "@cadenya/widgets-ui-react";
import { useToolResults } from "./use-tool-results";

afterEach(cleanup);
const call: ToolItem = {
  kind: "tool",
  id: "event-1",
  toolCallId: "call-1",
  status: "running",
  tool: { id: "tool-1", externalId: "read_state", name: "Read state" },
  createdAt: "2026-09-14T12:00:00Z",
};

test("Strict Mode and stream replays execute once; retry only redelivers", async () => {
  const execute = vi.fn(() => '{"value":1}');
  const submit = vi.fn().mockRejectedValueOnce(new Error("Offline")).mockResolvedValue(undefined);
  const { result, rerender } = renderHook(
    ({ timeline, loading, conversationId }) =>
      useToolResults({
        conversationId,
        timeline,
        loading,
        submit,
        // A fresh binding array on each render must not replay a local action.
        tools: [{ id: "tool-1", externalId: "read_state", execute }],
      }),
    {
      initialProps: { timeline: [call] as TimelineItem[], loading: true, conversationId: "chat-1" },
      wrapper: StrictMode,
    },
  );
  expect(execute).not.toHaveBeenCalled();
  rerender({ timeline: [call], loading: false, conversationId: "chat-1" });
  await waitFor(() => expect(result.current.hasFailures).toBe(true));
  rerender({ timeline: [{ ...call }], loading: false, conversationId: "chat-1" });
  expect(execute).toHaveBeenCalledTimes(1);
  expect(submit).toHaveBeenCalledTimes(1);
  rerender({ timeline: [], loading: false, conversationId: "chat-2" });
  expect(result.current.hasFailures).toBe(false);
  await act(() => result.current.retry());
  expect(submit).toHaveBeenCalledTimes(1);
  rerender({ timeline: [call], loading: false, conversationId: "chat-1" });
  await act(() => result.current.retry());
  expect(submit).toHaveBeenLastCalledWith("call-1", '{"value":1}');
  expect(submit).toHaveBeenCalledTimes(2);
  expect(execute).toHaveBeenCalledTimes(1);
  expect(result.current.hasFailures).toBe(false);
});

test("historical calls and terminal notices never execute page tools", () => {
  const execute = vi.fn(() => "{}");
  renderHook(() =>
    useToolResults({
      conversationId: "chat-1",
      loading: false,
      timeline: [
        call,
        { kind: "notice", id: "stopped", notice: "cancelled", createdAt: call.createdAt },
      ],
      tools: [{ id: "tool-1", externalId: "read_state", execute }],
      submit: vi.fn(),
    }),
  );
  expect(execute).not.toHaveBeenCalled();
});
