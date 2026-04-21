import type { Hint } from "./types";

interface Props {
  hints: Hint[];
  loading: boolean;
}

export function HintPanel({ hints, loading }: Props) {
  return (
    <div className="hint-pane">
      <div className="hint-header">Hints</div>
      <div className="hint-list">
        {loading && <div className="hint-loading">Thinking…</div>}
        {hints.length === 0 && !loading && (
          <div className="hint-empty">
            Click or select something in the editor.
            <br />
            Vim keystroke suggestions will appear here.
          </div>
        )}
        {hints.map((hint) => (
          <div key={hint.id} className="hint-card">
            <div className="hint-command">{hint.command}</div>
            <div className="hint-explanation">{hint.explanation}</div>
            <div className="hint-action">{hint.actionLabel}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
