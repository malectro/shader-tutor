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
  selection?: {
    text: string;
    anchorLine: number;
    anchorCol: number;
    headLine: number;
    headCol: number;
  };
  contextLines: string[];
  contextStartLine: number;
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
