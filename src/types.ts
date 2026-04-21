export type MouseActionKind =
  | "click-move"
  | "double-click-word"
  | "triple-click-line"
  | "drag-select";

export interface MouseAction {
  kind: MouseActionKind;
  before: {
    line: number;
    col: number;
  };
  after: {
    line: number;
    col: number;
  };
  /** Full text of the line at `before` (same as afterLineText when on one line). */
  beforeLineText: string;
  /** Full text of the line at `after`. */
  afterLineText: string;
  /** Character at the `after` cursor position, or "" if at end of line. */
  charAt: string;
  /** Identifier/word straddling the `after` cursor, if any. "" otherwise. */
  wordAt: string;
  selection?: {
    text: string;
    anchorLine: number;
    anchorCol: number;
    headLine: number;
    headCol: number;
    /** Character immediately before the selection start, or "" at doc start. */
    charBeforeAnchor: string;
    /** Character immediately after the selection end, or "" at doc end. */
    charAfterHead: string;
  };
}

export interface Hint {
  id?: string;
  command: string;
  explanation: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  actionLabel: string;
  /** Cursor location before the mouse action that produced this hint. */
  before?: { line: number; col: number };
}

export interface HintError {
  status: number;
  message: string;
  detail?: string;
}
