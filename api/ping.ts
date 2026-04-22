import { json } from "./_lib/http";

export async function GET(_req: Request): Promise<Response> {
  return json({
    ok: true,
    hasKey: !!process.env.ANTHROPIC_API_KEY,
    runtime: process.version,
    region: process.env.VERCEL_REGION ?? null,
    deployment: process.env.VERCEL_DEPLOYMENT_ID ?? null,
  });
}
