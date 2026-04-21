export function json(body: unknown, init: { status?: number; headers?: HeadersInit } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init.headers,
    },
  });
}

export function errorJson(
  status: number,
  error: string,
  detail?: string
): Response {
  return json(detail ? { error, detail } : { error }, { status });
}

export async function readJson<T = unknown>(req: Request): Promise<T> {
  return (await req.json()) as T;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
