import Anthropic from "@anthropic-ai/sdk";
import { clientIp, errorJson, readJson } from "./_lib/http";
import { getLesson } from "../lessons";
import type { LessonStep } from "../lessons/types";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a shader tutor embedded in a WebGL sandbox. Your student is trying to write a fragment shader in GLSL and sees a live canvas next to their code plus a static "goal" image showing what the current step should look like.

Your job is to TEACH, not to solve. The student learns by making the attempt themselves.

How to respond:
- Answer the student's question directly and concisely. No throat-clearing.
- Explain concepts, math, and GLSL built-ins as needed. Short code fragments (1-3 lines) are fine for illustrating a function signature or a small hint.
- Do NOT write the full solution for the current step, even if asked. If the student explicitly asks you to "just give me the answer", gently redirect: offer a bigger hint, ask what they've tried, or nudge them to the next concept.
- If the student's code has a compile error or an obvious bug, name it and explain what's happening rather than printing a fix.
- When they solve the step, acknowledge it briefly and invite them to advance.
- When asked to "check my work" or verify, judge whether their code achieves the step's goal. Lead with a clear yes/no (e.g. "Yep, that's it." or "Not quite yet."). If not yet, point at the specific concept they're missing without writing the fix. Tiny implementation differences from the reference are fine — focus on whether the visual result matches the goal.
- If they ask something outside the current step or lesson, answer briefly then redirect back.
- Keep answers tight. 1-4 short paragraphs max. Use inline \`code\` for identifiers.
- NEVER output markdown code fences with the full solution. Single-line snippets or tiny fragments only.
- The reference solution is provided for YOUR eyes only — use it to judge how close the student is and what to hint at. Do not paste it.
- Treat the reference solution as one valid implementation, not the only one. If the student writes different but
  valid code (different built-in, different constant, different decomposition) that still meets the step's goal, accept
  it. Only flag a difference if it's actually wrong or breaks the visual outcome.`;

interface TutorMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestPayload {
  lessonId: string;
  stepId: string;
  code: string;
  messages: TutorMessage[];
}

const bucket = new Map<string, { count: number; resetAt: number }>();
const LIMIT_PER_MIN = 30;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = bucket.get(ip);
  if (!entry || entry.resetAt < now) {
    bucket.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > LIMIT_PER_MIN;
}

function stepContext(lessonTitle: string, lessonSummary: string, step: LessonStep): string {
  return [
    `Lesson: ${lessonTitle}`,
    `Lesson summary: ${lessonSummary}`,
    ``,
    `Current step: ${step.title}`,
    `Goal: ${step.goal}`,
    `Key concepts: ${step.concepts.join("; ")}`,
    ``,
    `Reference solution for this step (PRIVATE — do not paste to the student):`,
    "```glsl",
    step.referenceGlsl.trim(),
    "```",
  ].join("\n");
}

function sseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

async function handle(req: Request): Promise<Response> {
  if (req.method !== "POST") return errorJson(405, "Method not allowed");
  if (rateLimited(clientIp(req))) {
    return errorJson(429, "Rate limited");
  }

  let payload: Partial<RequestPayload>;
  try {
    payload = await readJson(req);
  } catch {
    return errorJson(400, "Invalid JSON body");
  }

  const { lessonId, stepId, code, messages } = payload;
  if (!lessonId || !stepId) return errorJson(400, "Missing lessonId or stepId");
  if (typeof code !== "string") return errorJson(400, "Missing code");
  if (!Array.isArray(messages) || messages.length === 0) {
    return errorJson(400, "Missing messages");
  }

  const lesson = getLesson(lessonId);
  if (!lesson) return errorJson(404, `Unknown lesson: ${lessonId}`);
  const step = lesson.steps.find((s) => s.id === stepId);
  if (!step) return errorJson(404, `Unknown step: ${stepId}`);

  // Prepend the student's current code to the latest user message so the model
  // sees it alongside the question without polluting the cached prefix.
  const convo = messages.slice(0, -1);
  const latest = messages[messages.length - 1]!;
  if (latest.role !== "user") {
    return errorJson(400, "Last message must be from user");
  }
  const latestWithCode = [
    "My current code:",
    "```glsl",
    code,
    "```",
    "",
    latest.content,
  ].join("\n");

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: unknown) => controller.enqueue(encoder.encode(sseEvent(data)));

      try {
        const anthropicStream = client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 800,
          system: [
            {
              type: "text",
              text: SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
            {
              type: "text",
              text: stepContext(lesson.title, lesson.summary, step),
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [
            ...convo.map((m) => ({ role: m.role, content: m.content })),
            { role: "user" as const, content: latestWithCode },
          ],
        });

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            send({ type: "delta", text: event.delta.text });
          }
        }
        send({ type: "done" });
      } catch (err) {
        console.error("tutor stream failed", err);
        const detail =
          err instanceof Anthropic.APIError
            ? err.message
            : err instanceof Error
              ? err.message
              : String(err);
        send({ type: "error", error: detail });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

export default { fetch: handle };
