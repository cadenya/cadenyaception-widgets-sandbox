type PromptSuggestionsProps = {
  prompts: readonly string[];
  disabled: boolean;
  /** The owner exposes any send failure in its conversation UI. */
  onChoose: (prompt: string) => Promise<void>;
};

export function PromptSuggestions({ prompts, disabled, onChoose }: PromptSuggestionsProps) {
  return (
    <div className="starters">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          disabled={disabled}
          onClick={() => {
            void onChoose(prompt);
          }}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
