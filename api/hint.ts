import Anthropic from "@anthropic-ai/sdk";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a vim coach embedded in a code editor. The user just performed a mouse action. Your job: suggest the single best vim keystroke sequence that would have accomplished the same thing from normal mode.

Rules:
- Output ONLY valid JSON matching the schema below. No prose, no markdown fences.
- "command" is the exact keystrokes, in vim notation (e.g. "5j", "viw", "f(", "ggVG").
- "explanation" is ONE short sentence (<= 120 chars) explaining what the keystrokes do, written like a friendly peer.
- "difficulty" is "beginner" for h/j/k/l/w/b/e/0/$/gg/G, "intermediate" for f/t/%/text-objects/basic operators, "advanced" for marks, macros, ex commands, advanced composition.
- "actionLabel" is a 2-4 word label describing what the user did (e.g. "moved cursor down", "selected word").
- Prefer the shortest idiomatic vim command. Prefer relative motions (w, b, e, f{c}) over absolute jumps unless the distance is large.
- If the user clicked within the same word, suggest "w"/"b"/"e" or "f{char}" rather than counting columns.

Schema:
{"command": string, "explanation": string, "difficulty": "beginner"|"intermediate"|"advanced", "actionLabel": string}`;

interface ActionPayload {
  kind: string;
  before: { line: number; col: number };
  after: { line: number; col: number };
  selection?: { text: string; anchorLine: number; anchorCol: number; headLine: number; headCol: number };
  contextLines: string[];
  contextStartLine: number;
}

function buildUserMessage(action: ActionPayload): string {
  const { kind, before, after, selection, contextLines, contextStartLine } = action;
  const ctx = contextLines
    .map((line, i) => `${String(contextStartLine + i).padStart(4)} | ${line}`)
    .join("\n");

  const parts: string[] = [];
  parts.push(`Mouse action: ${kind}`);
  parts.push(`Cursor before: line ${before.line}, col ${before.col}`);
  parts.push(`Cursor after: line ${after.line}, col ${after.col}`);
  if (selection) {
    parts.push(
      `Selection: from (line ${selection.anchorLine}, col ${selection.anchorCol}) to (line ${selection.headLine}, col ${selection.headCol})`
    );
    parts.push(`Selected text: ${JSON.stringify(selection.text)}`);
  }
  parts.push("");
  parts.push("Surrounding code:");
  parts.push(ctx);
  return parts.join("\n");
}

// Extremely simple in-memory rate limit (per serverless instance).
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    res.status(429).json({ error: "Rate limited" });
    return;
  }

  const { action } = req.body as { action: ActionPayload };
  if (!action) {
    res.status(400).json({ error: "Missing action" });
    return;
  }

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
      messages: [{ role: "user", content: buildUserMessage(action) }],
    });

    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") {
      res.status(502).json({ error: "No text in response" });
      return;
    }

    const hint = JSON.parse(block.text);
    res.status(200).json(hint);
  } catch (err) {
    console.error("hint generation failed", err);
    res.status(500).json({ error: "Hint generation failed" });
  }
}
