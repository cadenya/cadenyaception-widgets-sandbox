"use client";

import { useState, type CSSProperties } from "react";
import { Chess, type Square } from "chess.js";
import { useExampleConversation } from "../shared/use-example-conversation";
import { useToolResults } from "../shared/use-tool-results";
import resources from "./cadenya/chess-resources.json";
import { applyAiMove, boardState } from "./chess-tools";

type PlayerMove = string | { from: string; to: string; promotion: string };
const REQUEST_BLACK_MOVE =
  "White has moved. Read the live board with get_board_state, play exactly one legal Black move with make_move, then explain it briefly.";

function describePosition(game: Chess, agentBusy: boolean): string {
  if (game.isCheckmate())
    return game.turn() === "w" ? "Checkmate — Cadenya wins." : "Checkmate — you win!";
  if (game.isStalemate()) return "Draw by stalemate.";
  if (game.isDraw()) return "Game drawn.";
  if (agentBusy) return "Cadenya is thinking…";
  if (game.turn() === "w") return `Your move${game.isCheck() ? " — you are in check" : ""}.`;
  return "Waiting for Cadenya’s move.";
}

/** Chess owns legality and turn state; React's FEN snapshot triggers board renders. */
export function useChessGame() {
  const [game] = useState(() => new Chess());
  const [fen, setFen] = useState(game.fen());
  const [selected, setSelected] = useState<Square | null>(null);
  const [promotion, setPromotion] = useState("q");
  const [moveInput, setMoveInput] = useState("");
  const [moveError, setMoveError] = useState<string | null>(null);
  const chat = useExampleConversation();
  const { conversation, conversationId } = chat;

  const delivery = useToolResults({
    conversationId,
    timeline: conversation.timeline,
    loading: conversation.loading,
    submit: conversation.setToolCallContent,
    tools: [
      {
        id: resources.get_board_state,
        externalId: "get_board_state",
        execute: () => JSON.stringify(boardState(game)),
      },
      {
        id: resources.make_move,
        externalId: "make_move",
        execute: (item) => {
          const result = applyAiMove(game, item.args);
          setFen(game.fen());
          return JSON.stringify(result);
        },
      },
    ],
  });

  function requestOpponentMove() {
    if (game.turn() !== "b" || game.isGameOver()) return;
    void chat.sendFromButton(REQUEST_BLACK_MOVE);
  }

  function playMove(move: PlayerMove): boolean {
    // Check the model again: two UI events can arrive before React re-renders.
    if (game.turn() !== "w" || game.isGameOver() || chat.busy) return false;
    try {
      game.move(move);
    } catch {
      setMoveError("That move is not legal. Try a highlighted destination.");
      return false;
    }
    setFen(game.fen());
    setSelected(null);
    setMoveInput("");
    setMoveError(null);
    requestOpponentMove();
    return true;
  }

  function selectSquare(square: string) {
    if (game.turn() !== "w" || game.isGameOver() || chat.busy) return;
    if (selected && selected !== square && playMove({ from: selected, to: square, promotion }))
      return;
    if (!/^[a-h][1-8]$/.test(square)) return;
    // React Chessboard supplies strings; validation above narrows to chess notation.
    const target = square as Square;
    setSelected(game.get(target)?.color === "w" ? target : null);
  }

  const legalDestinations = selected ? game.moves({ square: selected, verbose: true }) : [];
  const squareStyles: Record<string, CSSProperties> = {};
  if (selected) squareStyles[selected] = { backgroundColor: "#e8c567" };
  for (const move of legalDestinations)
    squareStyles[move.to] = {
      backgroundImage: "radial-gradient(circle, #285bc580 22%, transparent 24%)",
    };
  const history = game
    .history()
    .map((move, index) => `${index % 2 === 0 ? `${Math.floor(index / 2) + 1}. ` : ""}${move}`)
    .join("  ");

  return {
    fen,
    promotion,
    setPromotion,
    moveInput,
    setMoveInput,
    squareStyles,
    playMove,
    selectSquare,
    requestOpponentMove,
    canPlay: game.turn() === "w" && !game.isGameOver() && !chat.busy,
    canRetryOpponent: game.turn() === "b" && !game.isGameOver() && !chat.busy,
    status: describePosition(game, chat.busy),
    history: history || "You open the game.",
    board: boardState(game),
    error: moveError ?? chat.error,
    timeline: conversation.timeline,
    delivery,
  };
}
