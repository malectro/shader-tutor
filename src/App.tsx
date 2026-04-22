import { useCallback, useEffect, useRef, useState } from "react";
import { Editor } from "./Editor";
import { ShaderCanvas } from "./shader/ShaderCanvas";
import { TutorPanel } from "./tutor/TutorPanel";
import { lessons } from "../lessons";

const VIM_KEY = "shader-tutor.vim";

export default function App() {
  const lesson = lessons[0]!;
  const [stepIndex, setStepIndex] = useState(0);
  const [code, setCode] = useState(lesson.starterGlsl);
  const [shaderError, setShaderError] = useState<string | null>(null);
  const [vimMode, setVimMode] = useState(
    () => localStorage.getItem(VIM_KEY) === "1"
  );

  const step = lesson.steps[stepIndex]!;

  useEffect(() => {
    localStorage.setItem(VIM_KEY, vimMode ? "1" : "0");
  }, [vimMode]);

  const codeRef = useRef(code);
  codeRef.current = code;
  const getCode = useCallback(() => codeRef.current, []);

  const resetCode = () => setCode(lesson.starterGlsl);

  return (
    <div className="app">
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
          <button onClick={resetCode} className="reset-btn">
            Reset code
          </button>
        </div>
        <div className="editor-container">
          <Editor doc={code} vimMode={vimMode} onDocChange={setCode} />
        </div>
      </div>

      <div className="preview-pane">
        <div className="preview-canvas">
          <ShaderCanvas fragSrc={code} onError={setShaderError} />
          {shaderError && (
            <div className="shader-error-overlay">
              <div className="shader-error-title">Shader error</div>
              <pre>{shaderError}</pre>
            </div>
          )}
        </div>
        <TutorPanel
          lesson={lesson}
          step={step}
          stepIndex={stepIndex}
          onPrevStep={() => setStepIndex((i) => Math.max(0, i - 1))}
          onNextStep={() =>
            setStepIndex((i) => Math.min(lesson.steps.length - 1, i + 1))
          }
          getCode={getCode}
        />
      </div>
    </div>
  );
}
