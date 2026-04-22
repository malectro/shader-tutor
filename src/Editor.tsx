import { useEffect, useRef } from "react";
import { Compartment, EditorState } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { cpp } from "@codemirror/lang-cpp";
import { vim } from "@replit/codemirror-vim";

interface Props {
  doc: string;
  vimMode: boolean;
  onDocChange: (doc: string) => void;
}

/**
 * CodeMirror editor for GLSL. Uses the c++ language pack — GLSL's syntax is
 * a strict subset close enough that identifiers, strings, comments, and
 * numeric literals highlight correctly.
 *
 * Vim mode can be toggled without rebuilding the editor via a Compartment.
 */
export function Editor({ doc, vimMode, onDocChange }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const vimCompartment = useRef(new Compartment());
  const onDocChangeRef = useRef(onDocChange);
  onDocChangeRef.current = onDocChange;

  useEffect(() => {
    if (!parentRef.current) return;

    const state = EditorState.create({
      doc,
      extensions: [
        vimCompartment.current.of(vimMode ? vim() : []),
        lineNumbers(),
        highlightActiveLine(),
        drawSelection(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        cpp(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onDocChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.theme(
          {
            "&": { height: "100%" },
            ".cm-scroller": { fontFamily: "var(--font-mono)" },
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

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle vim mode without rebuilding the editor state.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: vimCompartment.current.reconfigure(vimMode ? vim() : []),
    });
  }, [vimMode]);

  // Replace doc when the prop changes externally (e.g., switching lessons).
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
