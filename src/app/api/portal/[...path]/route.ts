import { handleMockPortalRequest, type MockRequest } from "@/lib/mock/router";

export const dynamic = "force-dynamic";

const BACKEND = process.env.ARENA_BACKEND_URL;

const PASS_HEADERS = ["content-type", "content-disposition", "x-rows-count", "etag"] as const;

function parseCookies(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const name = part.slice(0, idx).trim();
    if (!name) continue;
    cookies[name] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return cookies;
}

async function proxyToBackend(
  request: Request,
  relPath: string,
  search: string,
  method: string,
): Promise<Response> {
  const headers: Record<string, string> = {};
  const contentType = request.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;
  const cookie = request.headers.get("cookie");
  if (cookie) headers["cookie"] = cookie;
  const ifMatch = request.headers.get("if-match");
  if (ifMatch) headers["if-match"] = ifMatch;

  const upstream = await fetch(`${BACKEND}/api/portal/${relPath}${search}`, {
    method,
    headers,
    body: method !== "GET" ? await request.text() : undefined,
    redirect: "manual",
  });

  const resHeaders = new Headers();
  for (const name of PASS_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) resHeaders.set(name, value);
  }
  for (const sc of upstream.headers.getSetCookie()) {
    resHeaders.append("set-cookie", sc);
  }
  return new Response(upstream.body, { status: upstream.status, headers: resHeaders });
}

async function handleMock(request: Request, relPath: string, method: string): Promise<Response> {
  const query = new URL(request.url).searchParams;
  const ifMatch = request.headers.get("if-match");
  if (ifMatch && !query.has("if_match")) query.set("if_match", ifMatch);
  const mockReq: MockRequest = {
    method,
    path: relPath,
    query,
    body: method !== "GET" ? await request.json().catch(() => null) : null,
    cookies: parseCookies(request.headers.get("cookie")),
  };
  const mockRes = handleMockPortalRequest(mockReq);
  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  for (const [name, value] of Object.entries(mockRes.headers ?? {})) {
    headers.set(name, value);
  }
  if (mockRes.body === undefined || mockRes.body === null) {
    return new Response(null, { status: mockRes.status, headers });
  }
  if (typeof mockRes.body === "string") {
    return new Response(mockRes.body, { status: mockRes.status, headers });
  }
  return new Response(JSON.stringify(mockRes.body), { status: mockRes.status, headers });
}

async function handler(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await context.params;
  const relPath = path.join("/");
  const search = new URL(request.url).search;
  const method = request.method.toUpperCase();

  if (BACKEND) return proxyToBackend(request, relPath, search, method);
  return handleMock(request, relPath, method);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
