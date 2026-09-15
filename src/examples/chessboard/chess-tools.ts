import { Chess } from "chess.js";
import { z } from "zod";

const aiMoveSchema = z.object({
  from: z.string().regex(/^[a-h][1-8]$/),
  to: z.string().regex(/^[a-h][1-8]$/),
  promotion: z.enum(["q", "r", "b", "n"]).default("q"),
  expected_fen: z.string().min(1),
});

export function boardState(game: Chess) {
  return {
    fen: game.fen(),
    turn: game.turn() === "w" ? "white" : "black",
    pieces: game.board().flat().filter(Boolean),
    ascii: game.ascii(),
    legalMoves: game
      .moves({ verbose: true })
      .map((move) => ({ from: move.from, to: move.to, promotion: move.promotion, san: move.san })),
    history: game.history(),
    inCheck: game.isCheck(),
    checkmate: game.isCheckmate(),
    stalemate: game.isStalemate(),
    draw: game.isDraw(),
    gameOver: game.isGameOver(),
  };
}
export function applyAiMove(game: Chess, args: unknown) {
  if (game.isGameOver()) return { error: "The game is over.", board: boardState(game) };
  if (game.turn() !== "b")
    return { error: "It is the human's turn (White).", board: boardState(game) };
  const parsed = aiMoveSchema.safeParse(args);
  if (!parsed.success)
    return {
      error: "Invalid move arguments. Use from, to, promotion, and expected_fen.",
      board: boardState(game),
    };
  const move = parsed.data;
  if (move.expected_fen !== game.fen())
    return { error: "Board changed. Call get_board_state again.", board: boardState(game) };
  try {
    const result = game.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion,
    });
    return { ok: true, move: result.san, board: boardState(game) };
  } catch {
    return { error: "Illegal move. Choose a move from legalMoves.", board: boardState(game) };
  }
}
