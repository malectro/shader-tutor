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
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { vim } from "@replit/codemirror-vim";

// Tokens that show up in GLSL: keyword (void/if/for), typeName (vec2/float),
// number, string, comment, function-call name, operator, punctuation.
const glslHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "#c792ea" },
  { tag: [t.typeName, t.standard(t.typeName)], color: "#82aaff" },
  { tag: t.number, color: "#f78c6c" },
  { tag: t.string, color: "#c3e88d" },
  { tag: t.comment, color: "#5c6773", fontStyle: "italic" },
  { tag: t.function(t.variableName), color: "#82aaff" },
  { tag: t.variableName, color: "#e4e4e4" },
  { tag: t.operator, color: "#89ddff" },
  { tag: t.punctuation, color: "#89ddff" },
  { tag: t.bracket, color: "#bbbbbb" },
  { tag: t.processingInstruction, color: "#c792ea" },
]);

interface Props {
  doc: string;
  vimMode: boolean;
  onDocChange: (doc: string) => void;
  /**
   * Called whenever the cursor / selection settles on a token. Empty string
   * when there's nothing askable (cursor in whitespace, no selection).
   */
  onTokenChange?: (token: string) => void;
}

const TOKEN_CHAR = /[A-Za-z0-9_]/;

function tokenAt(doc: string, pos: number): string {
  if (pos < 0 || pos > doc.length) return "";
  let start = pos;
  let end = pos;
  while (start > 0 && TOKEN_CHAR.test(doc[start - 1]!)) start--;
  while (end < doc.length && TOKEN_CHAR.test(doc[end]!)) end++;
  if (start === end) return "";
  const token = doc.slice(start, end);
  // Skip pure-numeric literals — "0.25" isn't a useful "ask about" target.
  if (/^[0-9.]+$/.test(token)) return "";
  return token;
}

/**
 * CodeMirror editor for GLSL. Uses the c++ language pack — GLSL's syntax is
 * a strict subset close enough that identifiers, strings, comments, and
 * numeric literals highlight correctly.
 *
 * Vim mode can be toggled without rebuilding the editor via a Compartment.
 */
export function Editor({ doc, vimMode, onDocChange, onTokenChange }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const vimCompartment = useRef(new Compartment());
  const onDocChangeRef = useRef(onDocChange);
  onDocChangeRef.current = onDocChange;
  const onTokenChangeRef = useRef(onTokenChange);
  onTokenChangeRef.current = onTokenChange;

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
        syntaxHighlighting(glslHighlight),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onDocChangeRef.current(update.state.doc.toString());
          }
          if (update.selectionSet || update.docChanged) {
            const cb = onTokenChangeRef.current;
            if (cb) {
              const sel = update.state.selection.main;
              const docText = update.state.doc.toString();
              const token = sel.empty
                ? tokenAt(docText, sel.head)
                : docText.slice(sel.from, sel.to).trim();
              cb(token.length > 0 && token.length < 60 ? token : "");
            }
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
