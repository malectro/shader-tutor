import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import type { IncomingMessage, ServerResponse } from "node:http";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Dev-only plugin: route /api/hint to the same handler Vercel runs in prod
// (Web Fetch API style: exported POST(Request) -> Response).
function apiHintDevPlugin(): Plugin {
  return {
    name: "api-hint-dev",
    configureServer(server) {
      server.middlewares.use("/api/hint", async (req, res) => {
        try {
          const mod = await server.ssrLoadModule("/api/hint.ts");
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
          console.error("dev api/hint error", err);
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
  const buf = Buffer.from(await response.arrayBuffer());
  res.end(buf);
}

export default defineConfig({
  plugins: [react(), apiHintDevPlugin()],
  server: { port: 5173 },
});
