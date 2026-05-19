import { NextRequest, NextResponse } from "next/server";

type RouteHandler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
) => Promise<NextResponse> | NextResponse;

interface CallOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** URL path params e.g. { id: "abc" } for a [id] segment. */
  params?: Record<string, string>;
  /** Raw Cookie header string from signSessionFor(). */
  cookies?: string;
  /** Query string params appended to the URL. */
  query?: Record<string, string>;
}

interface CallResult {
  status: number;
  json: <T = unknown>() => Promise<T>;
  headers: Headers;
}

/**
 * Call a Next.js App Router route handler directly — no HTTP server required.
 *
 * Usage:
 *   const res = await call(GET, { cookies: session, query: { id: "1" } });
 *   expect(res.status).toBe(200);
 *   const body = await res.json();
 */
export async function call(
  handler: RouteHandler,
  opts: CallOptions = {},
): Promise<CallResult> {
  const { method = "GET", body, params = {}, cookies, query } = opts;

  const url = new URL("http://localhost:3000/test");
  if (query) {
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  }

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (cookies) headers["Cookie"] = cookies;

  const req = new NextRequest(url, {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers,
  });

  const response = await handler(req, {
    params: Promise.resolve(params),
  });

  return {
    status: response.status,
    json: <T>() => response.json() as Promise<T>,
    headers: response.headers,
  };
}
