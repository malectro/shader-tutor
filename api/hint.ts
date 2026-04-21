import Anthropic from "@anthropic-ai/sdk";
import { clientIp, errorJson, json, readJson } from "./_lib/http";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a vim coach embedded in a code editor. The user just performed a mouse action in a file. Your job: suggest the single best vim keystroke sequence that would have accomplished the same thing from normal mode.

Rules:
- Output ONLY valid JSON matching the schema below. No prose, no markdown fences.
- "command" is the exact keystrokes, in vim notation (e.g. "21G", "f(", "/foo<CR>", "viw", "%").
- "explanation" is ONE short sentence (<= 120 chars) written like a friendly peer.
- "difficulty" is "beginner" for h/j/k/l/w/b/e/0/$/^/gg/G/{N}G, "intermediate" for f/t/F/T, search (/?), %, }/{, H/M/L, text objects, Ctrl-d/Ctrl-u, "advanced" for marks, macros, jumplist, *, #, ex commands.
- "actionLabel" is a 2-4 word label describing what the user did (e.g. "moved cursor down", "selected word").

Schema:
{"command": string, "explanation": string, "difficulty": "beginner"|"intermediate"|"advanced", "actionLabel": string}

The full file is provided with line numbers so you can reason about absolute positions, matching brackets, unique tokens, etc.`;

interface ActionPayload {
  kind: string;
  before: { line: number; col: number };
  after: { line: number; col: number };
  selection?: { text: string; anchorLine: number; anchorCol: number; headLine: number; headCol: number };
}

interface RequestPayload {
  action: ActionPayload;
  doc: string;
}

const MAX_DOC_CHARS = 80_000;

/** Format doc with line numbers, windowing around cursor if too large. */
function formatDoc(doc: string, cursorLine: number): string {
  const lines = doc.split("\n");
  const total = lines.length;
  const width = String(total).length;
  const fmt = (idx: number) => `${String(idx + 1).padStart(width)} | ${lines[idx]}`;

  if (doc.length <= MAX_DOC_CHARS) {
    return lines.map((_, i) => fmt(i)).join("\n");
  }

  const avgLineLen = Math.max(1, doc.length / total);
  const windowLines = Math.max(10, Math.floor(MAX_DOC_CHARS / avgLineLen));
  const half = Math.floor(windowLines / 2);
  let start = Math.max(0, cursorLine - 1 - half);
  let end = Math.min(total, start + windowLines);
  start = Math.max(0, end - windowLines);

  const parts: string[] = [];
  if (start > 0) parts.push(`<... ${start} lines omitted ...>`);
  for (let i = start; i < end; i++) parts.push(fmt(i));
  if (end < total) parts.push(`<... ${total - end} lines omitted ...>`);
  return parts.join("\n");
}

function buildActionMessage(action: ActionPayload): string {
  const { kind, before, after, selection } = action;
  const parts: string[] = [];
  parts.push(`Mouse action: ${kind}`);
  parts.push(`Cursor before: line ${before.line}, col ${before.col}`);
  parts.push(`Cursor after:  line ${after.line}, col ${after.col}`);
  if (selection) {
    parts.push(
      `Selection: from (line ${selection.anchorLine}, col ${selection.anchorCol}) to (line ${selection.headLine}, col ${selection.headCol})`
    );
    parts.push(`Selected text: ${JSON.stringify(selection.text)}`);
  }
  parts.push("");
  parts.push("Suggest the single best vim keystroke from normal mode.");
  return parts.join("\n");
}

// In-memory rate limit (per serverless instance).
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

export async function POST(req: Request): Promise<Response> {
  if (rateLimited(clientIp(req))) {
    return errorJson(429, "Rate limited");
  }

  let payload: Partial<RequestPayload>;
  try {
    payload = await readJson(req);
  } catch {
    return errorJson(400, "Invalid JSON body");
  }
  const { action, doc } = payload;
  if (!action) return errorJson(400, "Missing action");
  if (typeof doc !== "string") return errorJson(400, "Missing doc");

  const docBlock = `Current file (${doc.split("\n").length} lines):\n\n${formatDoc(doc, action.after.line)}`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: docBlock,
              cache_control: { type: "ephemeral" },
            },
            {
              type: "text",
              text: buildActionMessage(action),
            },
          ],
        },
      ],
    });

    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") {
      return errorJson(502, "No text in response");
    }

    try {
      return json(JSON.parse(block.text));
    } catch {
      return errorJson(502, "Model returned non-JSON", block.text.slice(0, 400));
    }
  } catch (err) {
    console.error("hint generation failed", err);
    const status = err instanceof Anthropic.APIError ? err.status ?? 500 : 500;
    const detail =
      err instanceof Anthropic.APIError
        ? err.message
        : err instanceof Error
          ? err.message
          : String(err);
    return errorJson(status, "Hint generation failed", detail);
  }
}
