import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { vim } from "@replit/codemirror-vim";
import type { MouseAction, MouseActionKind } from "./types";

interface Props {
  doc: string;
  onDocChange: (doc: string) => void;
  onAction: (action: MouseAction) => void;
}

export interface EditorHandle {
  setCursor(line: number, col: number): void;
  focus(): void;
}

export const Editor = forwardRef<EditorHandle, Props>(function Editor(
  { doc, onDocChange, onAction },
  ref
) {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      setCursor(line: number, col: number) {
        const view = viewRef.current;
        if (!view) return;
        const totalLines = view.state.doc.lines;
        const clampedLine = Math.min(Math.max(1, line), totalLines);
        const lineObj = view.state.doc.line(clampedLine);
        const clampedCol = Math.min(Math.max(1, col), lineObj.length + 1);
        const pos = lineObj.from + (clampedCol - 1);
        view.dispatch({ selection: { anchor: pos, head: pos } });
      },
      focus() {
        viewRef.current?.focus();
      },
    }),
    []
  );

  // Track cursor before mouse action so we can report before/after.
  const preMouseCursor = useRef<{ line: number; col: number } | null>(null);
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  useEffect(() => {
    if (!parentRef.current) return;

    const emitAction = (view: EditorView, kind: MouseActionKind) => {
      const state = view.state;
      const sel = state.selection.main;
      const after = offsetToLineCol(state, sel.head);
      const before = preMouseCursor.current ?? after;

      const afterLineObj = state.doc.line(after.line);
      const afterLineText = afterLineObj.text;
      const beforeLineText =
        before.line === after.line ? afterLineText : state.doc.line(before.line).text;

      const charAt =
        after.col < afterLineText.length
          ? afterLineText.slice(after.col, after.col + 1)
          : "";
      const wordAt = extractWordAt(afterLineText, after.col);

      let selection;
      if (!sel.empty) {
        const anchor = offsetToLineCol(state, sel.anchor);
        const head = offsetToLineCol(state, sel.head);
        const charBeforeAnchor =
          sel.anchor > 0 ? state.sliceDoc(sel.anchor - 1, sel.anchor) : "";
        const charAfterHead =
          sel.head < state.doc.length ? state.sliceDoc(sel.head, sel.head + 1) : "";
        selection = {
          text: state.sliceDoc(sel.from, sel.to),
          anchorLine: anchor.line,
          anchorCol: anchor.col,
          headLine: head.line,
          headCol: head.col,
          charBeforeAnchor,
          charAfterHead,
        };
      }

      onActionRef.current({
        kind,
        before,
        after,
        beforeLineText,
        afterLineText,
        charAt,
        wordAt,
        selection,
      });
    };

    const mouseDownHandler = EditorView.domEventHandlers({
      mousedown(_event, view) {
        const sel = view.state.selection.main;
        preMouseCursor.current = offsetToLineCol(view.state, sel.head);
      },
      mouseup(event, view) {
        // Defer so selection state settles.
        setTimeout(() => {
          const sel = view.state.selection.main;
          if (event.detail >= 3) {
            emitAction(view, "triple-click-line");
          } else if (event.detail === 2) {
            emitAction(view, "double-click-word");
          } else if (!sel.empty) {
            emitAction(view, "drag-select");
          } else {
            emitAction(view, "click-move");
          }
        }, 0);
      },
    });

    const state = EditorState.create({
      doc,
      extensions: [
        vim(),
        lineNumbers(),
        highlightActiveLine(),
        drawSelection(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        javascript(),
        mouseDownHandler,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onDocChange(update.state.doc.toString());
          }
        }),
        EditorView.theme(
          {
            "&": { height: "100%" },
            ".cm-scroller": { fontFamily: "ui-monospace, SF Mono, Menlo, monospace" },
            "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
              background: "var(--selection-bg)",
            },
            ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--accent)" },
          },
          { dark: true }
        ),
      ],
    });

    const view = new EditorView({ state, parent: parentRef.current });
    viewRef.current = view;
    view.focus();

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the doc prop changes externally (file open), replace the editor contents.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (view.state.doc.toString() === doc) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: doc },
    });
  }, [doc]);

  return <div ref={parentRef} style={{ height: "100%" }} />;
});

function offsetToLineCol(state: EditorState, offset: number): { line: number; col: number } {
  const line = state.doc.lineAt(offset);
  return { line: line.number, col: offset - line.from };
}

function extractWordAt(line: string, col: number): string {
  const isWordChar = (c: string | undefined) => (c ? /[\w$]/.test(c) : false);
  if (col < 0 || col > line.length) return "";
  let start = col;
  let end = col;
  while (start > 0 && isWordChar(line[start - 1])) start--;
  while (end < line.length && isWordChar(line[end])) end++;
  return line.slice(start, end);
}
