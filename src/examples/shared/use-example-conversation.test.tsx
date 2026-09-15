import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useExampleConversation } from "./use-example-conversation";

const sdk = vi.hoisted(() => ({ create: vi.fn(), send: vi.fn() }));
vi.mock("@cadenya/widgets-ui-react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@cadenya/widgets-ui-react")>()),
  useConversations: () => ({ create: sdk.create, error: null }),
  useConversation: () => ({
    send: sdk.send,
    loading: false,
    sending: false,
    timeline: [],
    error: null,
  }),
}));

afterEach(cleanup);
beforeEach(() => vi.resetAllMocks());

test("concurrent first sends create one conversation; later sends reuse it", async () => {
  const created = Promise.withResolvers<{ id: string }>();
  sdk.create.mockReturnValue(created.promise);
  sdk.send.mockResolvedValue(undefined);
  const { result } = renderHook(useExampleConversation);
  let first!: Promise<void>;
  let duplicate!: Promise<void>;
  await act(async () => {
    first = result.current.send("First message");
    duplicate = result.current.send("Duplicate click");
    await Promise.resolve();
  });
  expect(duplicate).toBe(first);
  expect(sdk.create).toHaveBeenCalledExactlyOnceWith("First message");
  expect(result.current.busy).toBe(true);
  await act(async () => {
    created.resolve({ id: "new-conversation" });
    await first;
  });
  expect(result.current.conversationId).toBe("new-conversation");
  expect(result.current.busy).toBe(false);
  await act(() => result.current.send("Follow-up"));
  expect(sdk.send).toHaveBeenCalledExactlyOnceWith("Follow-up");
  expect(sdk.create).toHaveBeenCalledTimes(1);
});

test("a slow create cannot steal selection after switching conversations", async () => {
  const created = Promise.withResolvers<{ id: string }>();
  sdk.create.mockReturnValue(created.promise);
  const { result } = renderHook(useExampleConversation);
  let sending!: Promise<void>;
  act(() => {
    sending = result.current.send("Start a new trip");
  });
  act(() => result.current.select("existing-trip"));
  await act(async () => {
    created.resolve({ id: "new-trip" });
    await sending;
  });
  expect(result.current.conversationId).toBe("existing-trip");
});

test("send failures reject for Composer, expose an error, and allow retry", async () => {
  sdk.create
    .mockRejectedValueOnce(new Error("Connection lost"))
    .mockResolvedValueOnce({ id: "retried-trip" });
  const { result } = renderHook(useExampleConversation);
  await act(async () => {
    await expect(result.current.send("Keep my draft")).rejects.toThrow("Connection lost");
  });
  expect(result.current.error).toBe("Connection lost");
  expect(result.current.busy).toBe(false);
  await act(() => result.current.send("Keep my draft"));
  expect(result.current.conversationId).toBe("retried-trip");
  expect(result.current.error).toBeNull();
});
