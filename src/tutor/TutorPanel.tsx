import { useEffect, useMemo, useRef, useState } from "react";
import type { Lesson, LessonStep } from "../../api/_lib/lessons/types";
import { renderToDataURL } from "../shader/renderToDataURL";
import { useTutorChat } from "./useTutorChat";

interface Props {
  lesson: Lesson;
  step: LessonStep;
  stepIndex: number;
  onPrevStep: () => void;
  onNextStep: () => void;
  getCode: () => string;
  /** Identifier currently under the editor cursor / selection, or "". */
  selectedToken: string;
}

const QUICK_ASKS = [
  "Check my work",
  "What are some useful built-ins for this step?",
  "Explain my current code",
  "Why isn't anything rendering?",
];

export function TutorPanel({
  lesson,
  step,
  stepIndex,
  onPrevStep,
  onNextStep,
  getCode,
  selectedToken,
}: Props) {
  const { messages, streaming, error, send } = useTutorChat({
    lessonId: lesson.id,
    stepId: step.id,
    getCode,
  });
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the textarea to fit its content (up to a sensible cap).
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  const goalSrc = useMemo(
    () => renderToDataURL(step.referenceGlsl, 320, 320, step.goalTime ?? 0),
    [step.referenceGlsl, step.goalTime]
  );

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const handleSend = async (text: string) => {
    if (streaming) return;
    setInput("");
    await send(text);
  };

  const isLast = stepIndex === lesson.steps.length - 1;

  return (
    <div className="tutor-pane">
      <div className="tutor-header">
        <div className="tutor-lesson">{lesson.title}</div>
        <div className="tutor-step-nav">
          <button onClick={onPrevStep} disabled={stepIndex === 0}>
            ←
          </button>
          <span>
            Step {stepIndex + 1} / {lesson.steps.length}
          </span>
          <button onClick={onNextStep} disabled={isLast}>
            →
          </button>
        </div>
      </div>

      <div className="tutor-goal">
        <div className="tutor-goal-img">
          {goalSrc ? (
            <img src={goalSrc} alt={`Goal: ${step.title}`} />
          ) : (
            <div className="tutor-goal-placeholder">no preview</div>
          )}
        </div>
        <div className="tutor-goal-text">
          <div className="tutor-step-title">{step.title}</div>
          <div className="tutor-step-goal">{step.goal}</div>
        </div>
      </div>

      <div className="tutor-messages" ref={listRef}>
        {messages.length === 0 && (
          <div className="tutor-empty">
            Ask a question or tap a prompt below. I'll nudge, not solve.
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`tutor-msg tutor-msg-${m.role}`}>
            {m.content || (streaming && m.role === "assistant" ? "…" : "")}
          </div>
        ))}
        {error && <div className="tutor-error">{error}</div>}
      </div>

      <div className="tutor-quick">
        {selectedToken && (
          <button
            className="tutor-quick-token"
            onClick={() =>
              handleSend(`What does \`${selectedToken}\` do here?`)
            }
            disabled={streaming}
            title={`Ask about ${selectedToken}`}
          >
            Ask about <code>{selectedToken}</code>
          </button>
        )}
        {QUICK_ASKS.map((q) => (
          <button key={q} onClick={() => handleSend(q)} disabled={streaming}>
            {q}
          </button>
        ))}
      </div>

      <form
        className="tutor-input"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
      >
        <textarea
          ref={textareaRef}
          placeholder="Ask the tutor…"
          value={input}
          rows={1}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(input);
            }
          }}
          disabled={streaming}
        />
        <button type="submit" disabled={streaming || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
