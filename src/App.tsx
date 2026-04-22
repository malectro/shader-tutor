import { useCallback, useEffect, useRef, useState } from "react";
import { Editor } from "./Editor";
import { ShaderCanvas } from "./shader/ShaderCanvas";
import { TutorPanel } from "./tutor/TutorPanel";
import { lessons } from "../lessons";
import { load, remove, save } from "./persist";

export default function App() {
  const lesson = lessons[0]!;
  const [stepIndex, setStepIndex] = useState(() =>
    Math.min(load(`step.${lesson.id}`, 0), lesson.steps.length - 1)
  );
  const [code, setCode] = useState(() => load(`code.${lesson.id}`, lesson.starterGlsl));
  const [shaderError, setShaderError] = useState<string | null>(null);
  const [vimMode, setVimMode] = useState(() => load("vim", false));
  const [selectedToken, setSelectedToken] = useState("");
  const [layout, setLayout] = useState<"stacked" | "columns">(
    () => load("layout", "stacked")
  );

  const step = lesson.steps[stepIndex]!;

  useEffect(() => save("vim", vimMode), [vimMode]);
  useEffect(() => save("layout", layout), [layout]);
  useEffect(() => save(`code.${lesson.id}`, code), [lesson.id, code]);
  useEffect(() => save(`step.${lesson.id}`, stepIndex), [lesson.id, stepIndex]);

  const codeRef = useRef(code);
  codeRef.current = code;
  const getCode = useCallback(() => codeRef.current, []);

  const resetCode = () => {
    setCode(lesson.starterGlsl);
    remove(`code.${lesson.id}`);
  };

  const canvasBlock = (
    <div className="preview-canvas">
      <ShaderCanvas fragSrc={code} onError={setShaderError} />
      {shaderError && (
        <div className="shader-error-overlay">
          <div className="shader-error-title">Shader error</div>
          <pre>{shaderError}</pre>
        </div>
      )}
    </div>
  );

  const tutor = (
    <TutorPanel
      lesson={lesson}
      step={step}
      stepIndex={stepIndex}
      onPrevStep={() => setStepIndex((i) => Math.max(0, i - 1))}
      onNextStep={() => setStepIndex((i) => Math.min(lesson.steps.length - 1, i + 1))}
      getCode={getCode}
      selectedToken={selectedToken}
    />
  );

  return (
    <div className={`app layout-${layout}`}>
      <div className="editor-pane">
        <div className="toolbar">
          <strong>Shader Tutor</strong>
          <label className="vim-toggle">
            <input
              type="checkbox"
              checked={vimMode}
              onChange={(e) => setVimMode(e.target.checked)}
            />
            <span className="vim-toggle-track" aria-hidden />
            <span>vim</span>
          </label>
          <button
            onClick={() => setLayout((l) => (l === "stacked" ? "columns" : "stacked"))}
            className="layout-btn"
            title="Toggle layout"
          >
            {layout === "stacked" ? "3 columns" : "Stack right"}
          </button>
          <button onClick={resetCode} className="reset-btn">
            Reset code
          </button>
        </div>
        <div className="editor-container">
          <Editor
            doc={code}
            vimMode={vimMode}
            onDocChange={setCode}
            onTokenChange={setSelectedToken}
          />
        </div>
      </div>

      {layout === "stacked" ? (
        <div className="preview-pane">
          {canvasBlock}
          {tutor}
        </div>
      ) : (
        <>
          <div className="canvas-column">{canvasBlock}</div>
          {tutor}
        </>
      )}
    </div>
  );
}
