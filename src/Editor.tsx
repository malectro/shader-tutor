import { useEffect, useRef } from "react";
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

const CONTEXT_RADIUS = 3;

export function Editor({ doc, onDocChange, onAction }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

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
      const doc = state.doc;

      const startLine = Math.max(1, after.line - CONTEXT_RADIUS);
      const endLine = Math.min(doc.lines, after.line + CONTEXT_RADIUS);
      const contextLines: string[] = [];
      for (let i = startLine; i <= endLine; i++) {
        contextLines.push(doc.line(i).text);
      }

      let selection;
      if (!sel.empty) {
        const anchor = offsetToLineCol(state, sel.anchor);
        const head = offsetToLineCol(state, sel.head);
        selection = {
          text: state.sliceDoc(sel.from, sel.to),
          anchorLine: anchor.line,
          anchorCol: anchor.col,
          headLine: head.line,
          headCol: head.col,
        };
      }

      onActionRef.current({
        kind,
        before,
        after,
        selection,
        contextLines,
        contextStartLine: startLine,
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
}

function offsetToLineCol(state: EditorState, offset: number): { line: number; col: number } {
  const line = state.doc.lineAt(offset);
  return { line: line.number, col: offset - line.from + 1 };
}
