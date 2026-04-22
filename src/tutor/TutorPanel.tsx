import { useEffect, useMemo, useRef, useState } from "react";
import type { Lesson, LessonStep } from "../../lessons/types";
import { renderToDataURL } from "../shader/renderToDataURL";
import { useTutorChat } from "./useTutorChat";

interface Props {
  lesson: Lesson;
  step: LessonStep;
  stepIndex: number;
  onPrevStep: () => void;
  onNextStep: () => void;
  getCode: () => string;
}

const QUICK_ASKS = [
  "Check my work",
  "Give me a hint",
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
}: Props) {
  const { messages, streaming, error, send } = useTutorChat({
    lessonId: lesson.id,
    stepId: step.id,
    getCode,
  });
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

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
        <input
          type="text"
          placeholder="Ask the tutor…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={streaming}
        />
        <button type="submit" disabled={streaming || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
