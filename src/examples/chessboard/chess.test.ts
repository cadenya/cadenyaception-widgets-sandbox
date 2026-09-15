import test from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { boardState, applyAiMove } from "./chess-tools.ts";

test("board tool exposes pieces and all legal opening moves", () => {
  const state = boardState(new Chess());
  assert.equal(state.turn, "white");
  assert.equal(state.pieces.length, 32);
  assert.equal(state.legalMoves.length, 20);
});
test("AI cannot move on human turn, from stale state, or to an illegal square", () => {
  const game = new Chess();
  assert.ok("error" in applyAiMove(game, { from: "e7", to: "e5", expected_fen: game.fen() }));
  const old = game.fen();
  game.move("e4");
  const current = game.fen();
  assert.ok("error" in applyAiMove(game, { from: "e7", to: "e5", expected_fen: old }));
  assert.ok("error" in applyAiMove(game, { from: "e7", to: "e4", expected_fen: current }));
  assert.equal(game.fen(), current);
  assert.ok("ok" in applyAiMove(game, { from: "e7", to: "e5", expected_fen: current }));
  assert.equal(game.turn(), "w");
  assert.deepEqual(game.history(), ["e4", "e5"]);
  assert.ok("error" in applyAiMove(game, { from: "e7", to: "e5", expected_fen: current }));
  assert.equal(game.history().length, 2);
});
test("AI supports underpromotion and refuses moves after game over", () => {
  const game = new Chess("7k/8/8/8/8/8/p7/7K b - - 0 1");
  assert.ok(
    "ok" in applyAiMove(game, { from: "a2", to: "a1", promotion: "n", expected_fen: game.fen() }),
  );
  assert.equal(game.get("a1")?.type, "n");
  const mate = new Chess();
  for (const move of ["f3", "e5", "g4", "Qh4#"]) mate.move(move);
  assert.equal(boardState(mate).checkmate, true);
  assert.ok("error" in applyAiMove(mate, { expected_fen: mate.fen() }));
});

test("malformed tool arguments never mutate the live board", () => {
  const game = new Chess();
  game.move("e4");
  const fen = game.fen();
  for (const input of [
    null,
    [],
    { from: 5, to: "e5", expected_fen: fen },
    { from: "e7", to: "e5", promotion: "king", expected_fen: fen },
  ]) {
    assert.ok(applyAiMove(game, input).error);
    assert.equal(game.fen(), fen);
  }
});
