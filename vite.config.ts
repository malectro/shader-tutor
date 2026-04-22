import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import type { IncomingMessage, ServerResponse } from "node:http";
import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

dotenv.config({ path: ".env.local" });

/**
 * Dev-only adapter: routes any /api/<name> request to the matching
 * api/<name>.ts file, invoking the exported POST/GET/etc. handler exactly
 * the way Vercel's Fluid runtime does in production.
 *
 * Streams ReadableStream bodies straight through so SSE works locally.
 */
function apiDevPlugin(): Plugin {
  return {
    name: "api-dev",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith("/api/")) return next();

        const name = url.slice("/api/".length).split("?")[0]!.split("/")[0];
        if (!name) return next();
        const file = resolve(process.cwd(), `api/${name}.ts`);
        if (!existsSync(file)) return next();

        try {
          const mod = await server.ssrLoadModule(`/api/${name}.ts`);
          const method = (req.method ?? "GET").toUpperCase();
          const handler = mod[method];
          if (typeof handler !== "function") {
            res.statusCode = 405;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ error: "Method not allowed" }));
            return;
          }
          const request = await nodeReqToFetchRequest(req);
          const response: Response = await handler(request);
          await writeFetchResponseToNode(response, res);
        } catch (err) {
          console.error(`dev /api/${name} error`, err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ error: String(err) }));
          }
        }
      });
    },
  };
}

async function nodeReqToFetchRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? "localhost";
  const url = `http://${host}${req.url ?? "/"}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) headers.set(key, value.join(", "));
    else headers.set(key, value);
  }
  const method = (req.method ?? "GET").toUpperCase();
  const init: RequestInit = { method, headers };
  if (method !== "GET" && method !== "HEAD") {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    init.body = Buffer.concat(chunks);
  }
  return new Request(url, init);
}

async function writeFetchResponseToNode(response: Response, res: ServerResponse): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  if (!response.body) {
    res.end();
    return;
  }
  const reader = response.body.getReader();
  res.flushHeaders?.();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
      // Force flush for SSE.
      (res as ServerResponse & { flush?: () => void }).flush?.();
    }
  } finally {
    res.end();
  }
}

export default defineConfig({
  plugins: [react(), apiDevPlugin()],
  server: { port: 5173 },
});
