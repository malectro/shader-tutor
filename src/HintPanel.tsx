import type { Hint, HintError } from "./types";

interface Props {
  hints: Hint[];
  loading: boolean;
  error: HintError | null;
  onDismissError: () => void;
  enabled: boolean;
  onToggleEnabled: () => void;
  onTry: (hint: Hint) => void;
}

export function HintPanel({
  hints,
  loading,
  error,
  onDismissError,
  enabled,
  onToggleEnabled,
  onTry,
}: Props) {
  return (
    <div className="hint-pane">
      <div className="hint-header">
        <span>Hints</span>
        <label className="hint-toggle" title="Turn automatic hints on/off">
          <input type="checkbox" checked={enabled} onChange={onToggleEnabled} />
          <span className="hint-toggle-track" aria-hidden />
          <span className="hint-toggle-label">{enabled ? "On" : "Off"}</span>
        </label>
      </div>
      <div className="hint-list">
        {error && <ErrorBanner error={error} onDismiss={onDismissError} />}
        {loading && <div className="hint-loading">Thinking…</div>}
        {hints.length === 0 && !loading && !error && (
          <div className="hint-empty">
            {enabled ? (
              <>
                Click or select something in the editor.
                <br />
                Vim keystroke suggestions will appear here.
              </>
            ) : (
              <>Automatic hints are off. Toggle above to resume.</>
            )}
          </div>
        )}
        {hints.map((hint) => (
          <div key={hint.id} className="hint-card">
            <div className="hint-command">{hint.command}</div>
            <div className="hint-explanation">{hint.explanation}</div>
            <div className="hint-card-footer">
              <span className="hint-action">{hint.actionLabel}</span>
              {hint.before && (
                <button
                  className="hint-try"
                  onClick={() => onTry(hint)}
                  title="Reset cursor and try the vim command yourself"
                >
                  Try it
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorBanner({ error, onDismiss }: { error: HintError; onDismiss: () => void }) {
  const title =
    error.status === 429
      ? "Rate limited"
      : error.status === 401 || error.status === 403
        ? "API auth problem"
        : error.status === 0
          ? "Network error"
          : error.message;
  return (
    <div className="hint-error">
      <div className="hint-error-header">
        <span className="hint-error-title">{title}</span>
        <button className="hint-error-dismiss" onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      </div>
      {error.detail && <div className="hint-error-detail">{error.detail}</div>}
      {error.status !== 0 && <div className="hint-error-status">HTTP {error.status}</div>}
    </div>
  );
}
