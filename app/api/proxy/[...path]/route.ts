/**
 * Proxy API requests to the backend so the browser only talks to same origin.
 * This avoids CORS issues when the app is embedded in GHL iframe.
 *
 * Vercel env (required): set BACKEND_URL or NEXT_PUBLIC_API_URL to your Render backend URL
 * (e.g. https://your-app.onrender.com — no trailing slash).
 * If you get 502: check that this is set in Vercel → Project → Settings → Environment Variables.
 */

const PROXY_TIMEOUT_MS = 35000; // Render free tier can cold-start in 30–60s

function getBackendUrl(): string {
  const url = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "";
  return url.replace(/\/$/, "");
}

function buildUrl(path: string[], search?: string): string {
  const base = getBackendUrl();
  const pathStr = path.join("/");
  const pathUrl = `${base}/${pathStr}`;
  return search ? `${pathUrl}${search}` : pathUrl;
}

function fail502(code: string, error: string) {
  return Response.json({ error, code }, { status: 502 });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const base = getBackendUrl();
    if (!base || base.startsWith("http://localhost")) {
      return fail502(
        "BACKEND_URL_NOT_SET",
        "Backend URL not set. In Vercel, add BACKEND_URL (or NEXT_PUBLIC_API_URL) with your Render URL (e.g. https://your-app.onrender.com)."
      );
    }
    const { path } = await params;
    const search = new URL(request.url).search || "";
    const url = buildUrl(path, search);
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });
    const data = await res.json().catch(() => ({ error: "Invalid JSON from backend" }));
    return Response.json(data, { status: res.status });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.cause instanceof Error
          ? `${err.message}: ${err.cause.message}`
          : err.message
        : "Proxy request failed";
    console.error("[proxy GET]", err);
    const isTimeout =
      err instanceof Error && (err.name === "TimeoutError" || err.message?.includes("timeout"));
    return fail502(
      "BACKEND_UNREACHABLE",
      isTimeout
        ? "Backend took too long to respond. If using Render free tier, the service may be starting — try again in a moment."
        : `Cannot reach backend: ${message}`
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const base = getBackendUrl();
    if (!base || base.startsWith("http://localhost")) {
      return fail502(
        "BACKEND_URL_NOT_SET",
        "Backend URL not set. In Vercel, add BACKEND_URL (or NEXT_PUBLIC_API_URL) with your Render URL (e.g. https://your-app.onrender.com)."
      );
    }
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
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });
    const data = await res.json().catch(() => ({ error: "Invalid JSON from backend" }));
    return Response.json(data, { status: res.status });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.cause instanceof Error
          ? `${err.message}: ${err.cause.message}`
          : err.message
        : "Proxy request failed";
    console.error("[proxy POST]", err);
    const isTimeout =
      err instanceof Error && (err.name === "TimeoutError" || err.message?.includes("timeout"));
    return fail502(
      "BACKEND_UNREACHABLE",
      isTimeout
        ? "Backend took too long to respond. If using Render free tier, the service may be starting — try again in a moment."
        : `Cannot reach backend: ${message}`
    );
  }
}
