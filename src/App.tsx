import { useState } from "react";
import { Editor } from "./Editor";
import { HintPanel } from "./HintPanel";
import { SAMPLE_CODE } from "./sample";
import type { Hint, MouseAction } from "./types";

export default function App() {
  const [doc, setDoc] = useState(SAMPLE_CODE);
  const [hints, setHints] = useState<Hint[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: MouseAction) => {
    setLoading(true);
    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const hint: Hint = await res.json();
      setHints((prev) => [{ ...hint, id: crypto.randomUUID() }, ...prev].slice(0, 10));
    } catch (err) {
      console.error("hint request failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFile = async (file: File) => {
    const text = await file.text();
    setDoc(text);
  };

  return (
    <div className="app">
      <div className="editor-pane">
        <div className="toolbar">
          <strong>VIM Instructor</strong>
          <label className="file-btn">
            Open file
            <input
              type="file"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleOpenFile(file);
              }}
            />
          </label>
          <span style={{ color: "#888", fontSize: 12 }}>
            Use the mouse — we'll teach you the vim keystroke.
          </span>
        </div>
        <div className="editor-container">
          <Editor doc={doc} onDocChange={setDoc} onAction={handleAction} />
        </div>
      </div>
      <HintPanel hints={hints} loading={loading} />
    </div>
  );
}
