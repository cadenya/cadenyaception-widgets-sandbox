import { ArrowIcon } from "@/components/brand";

type EmojiPanelProps = {
  emoji: string;
  shuffleCallId: string | null;
  lastShared: string | null;
  busy: boolean;
  deliveryFailed: boolean;
  onShuffle: () => void;
  onAsk: (message: string) => Promise<void>;
  onRetry: () => Promise<void>;
};

export function EmojiPanel({
  emoji,
  shuffleCallId,
  lastShared,
  busy,
  deliveryFailed,
  onShuffle,
  onAsk,
  onRetry,
}: EmojiPanelProps) {
  return (
    <aside className="emoji-rail" aria-label="Frontend state demo">
      <span className="emoji-eyebrow">FRONTEND STATE</span>
      <h2>A little window into your page</h2>
      <p>This emoji lives in your browser. Shuffle it, then ask the conversation what it sees.</p>
      <div aria-live="polite" aria-atomic="true">
        <div
          key={shuffleCallId ?? "initial"}
          className={`emoji-value${shuffleCallId ? " emoji-value-agent-shuffle" : ""}`}
          aria-label={`Current emoji: ${emoji}`}
        >
          {emoji}
          {shuffleCallId && <span className="emoji-agent-label">✦ Agent shuffled</span>}
        </div>
      </div>
      <button className="btn btn-primary" onClick={onShuffle}>
        <span>Shuffle Emoji</span>
        <span className="btn-arrow">
          <ArrowIcon />
        </span>
      </button>
      <button
        className="btn btn-soft"
        disabled={busy}
        onClick={() => {
          void onAsk("What is the current emoji on my page?");
        }}
      >
        <span>Ask about this emoji</span>
        <span className="btn-arrow">
          <ArrowIcon />
        </span>
      </button>
      <button
        className="btn btn-soft"
        disabled={busy}
        onClick={() => {
          void onAsk("Shuffle the emoji on my page once and tell me the new value.");
        }}
      >
        <span>Ask the agent to shuffle</span>
        <span className="btn-arrow">
          <ArrowIcon />
        </span>
      </button>
      <div className="emoji-shared">
        <span>Last shared with the agent</span>
        <strong aria-live="polite">{lastShared ?? "Nothing shared yet"}</strong>
      </div>
      {deliveryFailed && (
        <p role="alert">
          The emoji could not be sent.{" "}
          <button
            onClick={() => {
              void onRetry();
            }}
          >
            Retry sharing
          </button>
        </p>
      )}
      <p className="emoji-note">
        The Shuffle Emoji button stays local. Ask the agent to read or shuffle it to share the
        result.
      </p>
      <details>
        <summary>How it works</summary>
        <ol>
          <li>
            The agent calls <code>read_frontend_emoji</code> or <code>shuffle_frontend_emoji</code>.
          </li>
          <li>The page reads or shuffles its React state.</li>
          <li>
            <code>setToolCallContent(toolCallId, emoji)</code> returns the emoji and the agent
            continues.
          </li>
        </ol>
      </details>
    </aside>
  );
}
