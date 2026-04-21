import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import type { IncomingMessage } from "node:http";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Dev-only plugin: route /api/hint to the same handler Vercel will use in prod.
function apiHintDevPlugin(): Plugin {
  return {
    name: "api-hint-dev",
    configureServer(server) {
      server.middlewares.use("/api/hint", async (req, res) => {
        try {
          const body = await readJsonBody(req);
          const mod = await server.ssrLoadModule("/api/hint.ts");
          const handler = mod.default;
          // Adapt Node req/res to the shape our handler expects.
          (req as any).body = body;
          await handler(req, res);
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

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

export default defineConfig({
  plugins: [react(), apiHintDevPlugin()],
  server: { port: 5173 },
});
