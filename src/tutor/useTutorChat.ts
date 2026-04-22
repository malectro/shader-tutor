import { useCallback, useEffect, useRef, useState } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface UseTutorChatArgs {
  lessonId: string;
  stepId: string;
  /** Getter returning the latest editor code at the moment of send. */
  getCode: () => string;
}

interface SendResult {
  ok: boolean;
}

const MAX_MESSAGES = 20;

/**
 * Streaming chat backed by /api/tutor. Conversation is scoped per step:
 * whenever `stepId` changes the messages reset.
 *
 * Only one request may be in-flight at a time; calling `send` again while
 * streaming aborts the previous request.
 */
export function useTutorChat({ lessonId, stepId, getCode }: UseTutorChatArgs) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reset conversation on step change.
  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setStreaming(false);
    setError(null);
  }, [lessonId, stepId]);

  const send = useCallback(
    async (text: string): Promise<SendResult> => {
      const trimmed = text.trim();
      if (!trimmed) return { ok: false };

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      };
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
      };

      // Snapshot the conversation we'll send to the server (excluding the
      // empty assistant placeholder we're about to show).
      const outgoing = [...messages, userMsg]
        .slice(-MAX_MESSAGES)
        .map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [...prev, userMsg, assistantMsg].slice(-MAX_MESSAGES));
      setStreaming(true);
      setError(null);

      try {
        const res = await fetch("/api/tutor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId,
            stepId,
            code: getCode(),
            messages: outgoing,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const detail = await res.text().catch(() => "");
          setError(`Request failed (${res.status}). ${detail}`);
          setStreaming(false);
          return { ok: false };
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            const line = frame.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            try {
              const payload = JSON.parse(line.slice("data: ".length));
              if (payload.type === "delta") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id ? { ...m, content: m.content + payload.text } : m
                  )
                );
              } else if (payload.type === "error") {
                setError(payload.error ?? "Model error");
              }
            } catch {
              // ignore malformed frame
            }
          }
        }

        setStreaming(false);
        return { ok: true };
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          // Superseded by a newer send; leave state to the new caller.
          return { ok: false };
        }
        setError(err instanceof Error ? err.message : String(err));
        setStreaming(false);
        return { ok: false };
      }
    },
    [lessonId, stepId, messages, getCode]
  );

  return { messages, streaming, error, send };
}
