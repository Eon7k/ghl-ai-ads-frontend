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
  const url =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === "development" ? "http://localhost:3001" : "");
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
    const headers: HeadersInit = {};
    const auth = request.headers.get("authorization");
    if (auth) headers["Authorization"] = auth;
    const res = await fetch(url, {
      headers: Object.keys(headers).length ? headers : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });
    const contentType = res.headers.get("content-type") || "";
    if (contentType.startsWith("image/")) {
      const blob = await res.arrayBuffer();
      return new Response(blob, {
        status: res.status,
        headers: { "Content-Type": contentType },
      });
    }
    const isJson = contentType.includes("application/json");
    const data = isJson
      ? await res.json().catch(() => ({ error: "Invalid JSON from backend" }))
      : res.status >= 400
        ? { error: `Backend returned ${res.status}. If using Render, the service may be starting—try again in a moment.` }
        : { error: "Backend did not return JSON." };
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
    const auth = request.headers.get("authorization");
    if (auth) headers["Authorization"] = auth;
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

export async function PATCH(
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
    const auth = request.headers.get("authorization");
    if (auth) headers["Authorization"] = auth;
    const res = await fetch(url, {
      method: "PATCH",
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
    console.error("[proxy PATCH]", err);
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

export async function DELETE(
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
    const headers: HeadersInit = {};
    const auth = request.headers.get("authorization");
    if (auth) headers["Authorization"] = auth;
    const res = await fetch(url, {
      method: "DELETE",
      headers: Object.keys(headers).length ? headers : undefined,
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
    console.error("[proxy DELETE]", err);
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
