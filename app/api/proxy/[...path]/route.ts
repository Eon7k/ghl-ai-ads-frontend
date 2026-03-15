/**
 * Proxy API requests to the backend so the browser only talks to same origin.
 * This avoids CORS issues when the app is embedded in GHL iframe.
 */

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function buildUrl(path: string[]) {
  const pathStr = path.join("/");
  const base = BACKEND.replace(/\/$/, "");
  return `${base}/${pathStr}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const url = buildUrl(path);
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json().catch(() => ({ error: "Invalid JSON from backend" }));
    return Response.json(data, { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Proxy request failed";
    console.error("[proxy GET]", err);
    return Response.json(
      { error: message },
      { status: 502 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const url = buildUrl(path);
    const body = await request.text();
    const headers: HeadersInit = {};
    const contentType = request.headers.get("content-type");
    if (contentType) headers["Content-Type"] = contentType;
    const res = await fetch(url, {
      method: "POST",
      body: body || undefined,
      headers,
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({ error: "Invalid JSON from backend" }));
    return Response.json(data, { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Proxy request failed";
    console.error("[proxy POST]", err);
    return Response.json(
      { error: message },
      { status: 502 }
    );
  }
}
