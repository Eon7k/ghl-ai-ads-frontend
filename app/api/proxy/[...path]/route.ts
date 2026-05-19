/**
 * Proxy API requests to the backend so the browser only talks to same origin.
 * This avoids CORS issues when the app is embedded in GHL iframe.
 *
 * Operators: configure BACKEND_URL or NEXT_PUBLIC_API_URL (no trailing slash). Serverless timeouts may apply for long AI runs.
 */
/** Allow long-running POST (e.g. AI variant generation). */
export const maxDuration = 120;

const PROXY_TIMEOUT_MS = 118_000; // Stay just under maxDuration; cold start + AI can be slow
const IS_DEV = process.env.NODE_ENV === "development";

function backendUrlNotSetMessage(): string {
  return IS_DEV
    ? "Backend URL not configured locally. Add BACKEND_URL or NEXT_PUBLIC_API_URL (for example in .env.local)."
    : "This app isn't connected to its server configuration yet. Ask your administrator.";
}

/** Shown when the upstream request hits our proxy/network timeout — keep wording end-user friendly. */
function proxyTimeoutUserMessage(): string {
  return "This took too long to finish. Try again with fewer options, wait a minute, or contact your administrator if it keeps happening.";
}

function getBackendUrl(): string {
  const url =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (IS_DEV ? "http://localhost:3001" : "");
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

/** Backend sometimes returns plain text or HTML (e.g. 503 HTML). Parse JSON when possible; otherwise a clear message. */
function formatNonJsonBackendError(status: number, rawBody: string): { error: string } {
  const t = rawBody.trim();
  const isHtml = t.startsWith("<!") || /^<html/i.test(t);
  const snippet = isHtml ? "" : t.replace(/\s+/g, " ").slice(0, 800);

  const chunks: string[] = [];
  if (snippet) {
    chunks.push(snippet);
  } else {
    chunks.push(`The server returned HTTP ${status} with an unexpected response.`);
  }
  if (status === 503) {
    chunks.push("The API may still be waking up or is busy—wait a minute and try again.");
  }
  if (status === 502) {
    chunks.push("Ask your administrator to confirm the API is running and reachable.");
  }
  return { error: chunks.join(" ") };
}

async function readBackendProxyBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) {
    return res.status >= 400 ? formatNonJsonBackendError(res.status, "") : {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return res.status >= 400
      ? formatNonJsonBackendError(res.status, text)
      : { error: "The server did not return valid JSON.", preview: text.slice(0, 200) };
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const base = getBackendUrl();
    if (!base || base.startsWith("http://localhost")) {
      return fail502("BACKEND_URL_NOT_SET", backendUrlNotSetMessage());
    }
    const { path } = await params;
    const search = new URL(request.url).search || "";
    const url = buildUrl(path, search);
    const headers: HeadersInit = {};
    const auth = request.headers.get("authorization");
    if (auth) headers["Authorization"] = auth;
    const viewingAs = request.headers.get("x-viewing-as");
    if (viewingAs) headers["X-Viewing-As"] = viewingAs;
    const res = await fetch(url, {
      headers: Object.keys(headers).length ? headers : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });
    const contentType = res.headers.get("content-type") || "";
    if (contentType.startsWith("image/") || contentType.startsWith("video/")) {
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
        ? { error: `The server returned ${res.status}. It may still be starting—try again in a moment.` }
        : { error: "The server did not return JSON." };
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
      isTimeout ? proxyTimeoutUserMessage() : `Cannot reach backend: ${message}`
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
      return fail502("BACKEND_URL_NOT_SET", backendUrlNotSetMessage());
    }
    const { path } = await params;
    const url = buildUrl(path);
    const body = await request.text();
    const headers: HeadersInit = {};
    const reqContentType = request.headers.get("content-type");
    if (reqContentType) headers["Content-Type"] = reqContentType;
    const auth = request.headers.get("authorization");
    if (auth) headers["Authorization"] = auth;
    const viewingAs = request.headers.get("x-viewing-as");
    if (viewingAs) headers["X-Viewing-As"] = viewingAs;
    const res = await fetch(url, {
      method: "POST",
      body: body || undefined,
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });
    const data = await readBackendProxyBody(res);
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
      isTimeout ? proxyTimeoutUserMessage() : `Cannot reach backend: ${message}`
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const base = getBackendUrl();
    if (!base || base.startsWith("http://localhost")) {
      return fail502("BACKEND_URL_NOT_SET", backendUrlNotSetMessage());
    }
    const { path } = await params;
    const url = buildUrl(path);
    const body = await request.text();
    const headers: HeadersInit = {};
    const contentType = request.headers.get("content-type");
    if (contentType) headers["Content-Type"] = contentType;
    const auth = request.headers.get("authorization");
    if (auth) headers["Authorization"] = auth;
    const viewingAs = request.headers.get("x-viewing-as");
    if (viewingAs) headers["X-Viewing-As"] = viewingAs;
    const res = await fetch(url, {
      method: "PUT",
      body: body || undefined,
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });
    const data = await readBackendProxyBody(res);
    return Response.json(data, { status: res.status });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.cause instanceof Error
          ? `${err.message}: ${err.cause.message}`
          : err.message
        : "Proxy request failed";
    console.error("[proxy PUT]", err);
    const isTimeout =
      err instanceof Error && (err.name === "TimeoutError" || err.message?.includes("timeout"));
    return fail502(
      "BACKEND_UNREACHABLE",
      isTimeout ? proxyTimeoutUserMessage() : `Cannot reach backend: ${message}`
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
      return fail502("BACKEND_URL_NOT_SET", backendUrlNotSetMessage());
    }
    const { path } = await params;
    const url = buildUrl(path);
    const body = await request.text();
    const headers: HeadersInit = {};
    const contentType = request.headers.get("content-type");
    if (contentType) headers["Content-Type"] = contentType;
    const auth = request.headers.get("authorization");
    if (auth) headers["Authorization"] = auth;
    const viewingAs = request.headers.get("x-viewing-as");
    if (viewingAs) headers["X-Viewing-As"] = viewingAs;
    const res = await fetch(url, {
      method: "PATCH",
      body: body || undefined,
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });
    const data = await readBackendProxyBody(res);
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
      isTimeout ? proxyTimeoutUserMessage() : `Cannot reach backend: ${message}`
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
      return fail502("BACKEND_URL_NOT_SET", backendUrlNotSetMessage());
    }
    const { path } = await params;
    const url = buildUrl(path);
    const headers: HeadersInit = {};
    const auth = request.headers.get("authorization");
    if (auth) headers["Authorization"] = auth;
    const viewingAs = request.headers.get("x-viewing-as");
    if (viewingAs) headers["X-Viewing-As"] = viewingAs;
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
      isTimeout ? proxyTimeoutUserMessage() : `Cannot reach backend: ${message}`
    );
  }
}
