/**
 * Proxy API requests to the backend so the browser only talks to same origin.
 * This avoids CORS issues when the app is embedded in GHL iframe.
 *
 * Vercel env (required): set BACKEND_URL or NEXT_PUBLIC_API_URL to your Render backend URL
 * (e.g. https://your-app.onrender.com — no trailing slash).
 * If you get 502: check that this is set in Vercel → Project → Settings → Environment Variables.
 *
 * Creating campaigns calls the backend for AI variant generation — that can take 30–90s with many
 * variants. **Vercel Hobby** caps serverless routes at **10s** unless you upgrade; use fewer variants
 * or Vercel Pro (60s max below) for reliable creates.
 */
/** Allow long-running POST (e.g. AI). Vercel Hobby max is 10s; Pro supports up to 60s+ per plan. */
export const maxDuration = 60;

const PROXY_TIMEOUT_MS = 58_000; // Stay just under maxDuration; Render cold start + AI can be slow

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

/** Backend sometimes returns plain text or HTML (e.g. Render 503). Parse JSON when possible; otherwise a clear message (not always Prisma). */
function formatNonJsonBackendError(status: number, rawBody: string): { error: string } {
  const t = rawBody.trim();
  const isHtml = t.startsWith("<!") || /^<html/i.test(t);
  const snippet = isHtml ? "" : t.replace(/\s+/g, " ").slice(0, 800);

  const chunks: string[] = [];
  if (snippet) {
    chunks.push(snippet);
  } else {
    chunks.push(`Backend returned HTTP ${status} with a non-JSON body.`);
  }
  if (status === 503) {
    chunks.push(
      "This often means the API is waking up or busy (Render free tier can take a minute after sleep). Retry shortly."
    );
  }
  if (status === 502) {
    chunks.push("Check Vercel BACKEND_URL and that your Render web service is running.");
  }
  if (/prisma|P20\d{2}|column .*does not exist|relation .* does not exist|db push|migrate/i.test(t)) {
    chunks.push('If the backend logs mention a missing DB column, run `npx prisma db push` against production.');
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
      : { error: "Backend did not return valid JSON.", preview: text.slice(0, 200) };
  }
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
    const viewingAs = request.headers.get("x-viewing-as");
    if (viewingAs) headers["X-Viewing-As"] = viewingAs;
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
        ? "Backend took too long (proxy timeout). If you had many AI variants, try 1–3 first. Render free tier can be slow to wake; Vercel Hobby only allows ~10s unless you upgrade to Pro."
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
      isTimeout
        ? "Backend took too long (proxy timeout). If you had many AI variants, try fewer. Vercel Hobby limits routes to ~10s; Pro allows longer."
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
    const viewingAs = request.headers.get("x-viewing-as");
    if (viewingAs) headers["X-Viewing-As"] = viewingAs;
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
        ? "Backend took too long (proxy timeout). Render may be waking up; Vercel Hobby limits routes to ~10s."
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
      isTimeout
        ? "Backend took too long (proxy timeout). Render may be waking up; Vercel Hobby limits routes to ~10s."
        : `Cannot reach backend: ${message}`
    );
  }
}
