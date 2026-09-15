import test from "node:test";
import assert from "node:assert/strict";
import { ToolResultQueue } from "./tool-result-queue.ts";

test("a replay during delivery executes and submits a local action once", async () => {
  const queue = new ToolResultQueue();
  let executions = 0;
  const submissions: string[] = [];
  let finish!: () => void;
  const submit = async (_id: string, content: string) => {
    submissions.push(content);
    await new Promise<void>((resolve) => {
      finish = resolve;
    });
  };
  const execute = () => JSON.stringify({ moves: ++executions });
  const pending = queue.execute("chess", "move-1", execute, submit);
  assert.deepEqual(await queue.execute("chess", "move-1", execute, submit), { status: "skipped" });
  assert.equal(executions, 1);
  finish();
  assert.deepEqual(await pending, { status: "delivered", content: '{"moves":1}' });
  assert.deepEqual(submissions, ['{"moves":1}']);
});

test("delivery retry reuses the captured result and never repeats the side effect", async () => {
  const queue = new ToolResultQueue();
  let emoji = "🌵";
  let executions = 0;
  await queue.execute(
    "travel",
    "shuffle",
    () => {
      executions++;
      return emoji;
    },
    async () => {
      throw Error("Offline");
    },
  );
  assert.equal(queue.isFailed("travel", "shuffle"), true);
  emoji = "🚀";
  const sent: string[] = [];
  assert.equal(
    (
      await queue.retry("other-chat", "shuffle", async () => {
        throw Error("Wrong chat");
      })
    ).status,
    "skipped",
  );
  await queue.retry("travel", "shuffle", async (_id, content) => {
    sent.push(content);
  });
  assert.equal(executions, 1);
  assert.deepEqual(sent, ["🌵"]);
  assert.equal(queue.isFailed("travel", "shuffle"), false);
});

test("duplicate retries do not overlap and another failed result stays failed", async () => {
  const queue = new ToolResultQueue();
  const fail = async () => {
    throw Error("Offline");
  };
  await queue.execute("diagram", "a", () => "first", fail);
  await queue.execute("diagram", "b", () => "second", fail);
  let finish!: () => void;
  const pending = queue.retry(
    "diagram",
    "a",
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  assert.equal((await queue.retry("diagram", "a", fail)).status, "skipped");
  finish();
  await pending;
  assert.equal(queue.isFailed("diagram", "a"), false);
  assert.equal(queue.isFailed("diagram", "b"), true);
});

test("execution failures become a stable tool result and do not rerun on delivery retry", async () => {
  const queue = new ToolResultQueue();
  let executions = 0;
  await queue.execute(
    "diagram",
    "bad",
    () => {
      executions++;
      throw Error("Invalid changes");
    },
    async () => {
      throw Error("Offline");
    },
  );
  const outcome = await queue.retry("diagram", "bad", async (_id, content) => {
    assert.deepEqual(JSON.parse(content), { error: "Invalid changes" });
  });
  assert.equal(outcome.status, "delivered");
  assert.equal(executions, 1);
});
