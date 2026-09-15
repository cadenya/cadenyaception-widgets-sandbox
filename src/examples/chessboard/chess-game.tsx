"use client";

import { useState } from "react";
import { Chessboard } from "react-chessboard";
import { ChessActivity } from "./chess-activity";
import { useChessGame } from "./use-chess-game";

export function ChessGame() {
  const [round, setRound] = useState(0);
  // A fresh mount resets the board, conversation, and tool-result receipts together.
  return <ChessRound key={round} onNewGame={() => setRound((value) => value + 1)} />;
}

function ChessRound({ onNewGame }: { onNewGame: () => void }) {
  const game = useChessGame();
  return (
    <div className="chess-layout">
      <section className="chess-play" aria-label="Chess game">
        <div className="chess-heading">
          <div>
            <span className="emoji-eyebrow">YOU · WHITE / CADENYA · BLACK</span>
            <h2>A move ahead</h2>
          </div>
          <button onClick={onNewGame}>New game</button>
        </div>
        <p role="status">{game.status}</p>
        <div className="chess-board">
          <Chessboard
            options={{
              id: "sandbox-chessboard",
              position: game.fen,
              // Games continue in hidden tabs, where animated pieces cannot measure squares.
              showAnimations: false,
              boardOrientation: "white",
              allowDragging: game.canPlay,
              canDragPiece: ({ piece }) => piece.pieceType.startsWith("w"),
              onPieceDrop: ({ sourceSquare, targetSquare }) =>
                targetSquare
                  ? game.playMove({
                      from: sourceSquare,
                      to: targetSquare,
                      promotion: game.promotion,
                    })
                  : false,
              onSquareClick: ({ square }) => game.selectSquare(square),
              squareStyles: game.squareStyles,
              darkSquareStyle: { backgroundColor: "#7794b4" },
              lightSquareStyle: { backgroundColor: "#edf2f8" },
            }}
          />
        </div>
        <p className="chess-hint">
          Drag a piece or click its square and destination. Legal moves are highlighted.
        </p>
        <form
          className="chess-controls"
          onSubmit={(event) => {
            event.preventDefault();
            game.playMove(game.moveInput);
          }}
        >
          <label>
            Move{" "}
            <input
              aria-label="Your chess move"
              placeholder="e4 or e2e4"
              value={game.moveInput}
              onChange={(event) => game.setMoveInput(event.target.value)}
              disabled={!game.canPlay}
            />
          </label>
          <button type="submit" disabled={!game.canPlay || !game.moveInput.trim()}>
            Play move
          </button>
          <label>
            Promote to{" "}
            <select
              value={game.promotion}
              onChange={(event) => game.setPromotion(event.target.value)}
            >
              <option value="q">Queen</option>
              <option value="r">Rook</option>
              <option value="b">Bishop</option>
              <option value="n">Knight</option>
            </select>
          </label>
        </form>
        {game.error && (
          <p role="alert" className="conversation-error">
            {game.error}
          </p>
        )}
        {game.delivery.hasFailures && (
          <p role="alert">
            Could not send the tool result.{" "}
            <button
              onClick={() => {
                void game.delivery.retry();
              }}
            >
              Retry tool result
            </button>
          </p>
        )}
        {game.canRetryOpponent && (
          <button
            onClick={() => {
              game.requestOpponentMove();
            }}
          >
            Retry AI turn
          </button>
        )}
      </section>
      <aside className="chess-sidebar">
        <h3>The opponent’s tools</h3>
        <p>
          The AI reads the board from this page, then sends its move back. Every move is checked
          here before a piece moves.
        </p>
        <ChessActivity timeline={game.timeline} />
        <h3>Moves</h3>
        <p className="chess-history">{game.history}</p>
        <details>
          <summary>Live board state</summary>
          <pre>{JSON.stringify(game.board, null, 2)}</pre>
        </details>
        <p className="chess-hint">
          Games stay in this tab while you explore the conversation widget. Reloading starts a new
          game.
        </p>
      </aside>
    </div>
  );
}
