# Chessboard example

A `react-chessboard` game where a dedicated Cadenya agent plays Black using two [bare tools](https://cadenya.com/docs/guides/the-basics/tool-sets) that read and update live browser state.

| File                        | Responsibility                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------- |
| `chess-game.tsx`            | Render the board and controls; remount the game when the visitor resets.            |
| `use-chess-game.ts`         | Coordinate human moves, live board snapshots, and the agent conversation.           |
| `chess-tools.ts`            | Read board state and validate Black's tool arguments, turn, FEN, and move legality. |
| `chess-activity.tsx`        | Render assistant messages and tool events, newest first.                            |
| `chess.test.ts`             | Test legal moves, stale state, promotion, and malformed inputs.                     |
| `cadenya/system-prompt.txt` | The chess opponent instructions, separate from provisioning.                        |
| `cadenya/*.json`            | Bare tool contracts; `chess-resources.json` records provisioned IDs.                |
| `setup.mjs`                 | Provision the example and copy the travel widget's origin allowlist.                |

## How it works

Open [/chess](https://widgets-demo.cadenya.com/chess) to play. The game stays mounted when switching examples. It uses `react-chessboard` as a controlled board and React hooks to update its position. `chess.js` validates
moves, check, checkmate, draws, castling, en passant, and promotion. Piece animations are disabled because agent moves can arrive while the tab is hidden; the board library cannot measure hidden squares for animation. You play White
by dragging, clicking source/destination, or entering SAN/coordinate notation.
Choose the promotion piece before moving a pawn to its final rank.

A separate Cadenya agent and widget have only two bare tools:

- `get_board_state`: FEN, piece locations, ASCII board, legal moves, history, and
  game status from the live page.
- `make_move`: validates Black's turn, legality, and `expected_fen` before applying
  a move. Results go back through `setToolCallContent`; retries of result delivery
  reuse the same result without applying the move twice.

Each game creates its own conversation on the first White move. **New game** resets the board and starts a fresh conversation; replies from another game cannot affect it. Reloading resets local games. The opponent is a language model, so playing strength and response time depend on the model you select.

## Setup

Follow the [local setup instructions](../../../README.md#run-locally). To update just this example after setting up travel:

```sh
npm run setup:chess
```

Setup synchronizes the two tool definitions, agent prompt, and selected model, and copies the travel widget's origin allowlist. It writes resource IDs to `cadenya/chess-resources.json`. See the [widgets guide](https://cadenya.com/docs/guides/the-basics/widgets) for widget configuration.

## State and delivery boundaries

`Chess` is the authority for legality and whose turn it is. The hook keeps a FEN snapshot in React state to render the board. It checks the live engine before every human move, so two UI events in the same render cycle cannot make two White moves. Agent arguments enter as `unknown` and pass Zod validation before reaching `chess.js`.

A move changes the local engine before its result is delivered. The [shared result queue](../README.md) captures the response and retries delivery without applying the move again. This guarantee lasts for the mounted game; it is not durable storage or a multiplayer protocol. New game remounts the controller, conversation, and result queue together.
