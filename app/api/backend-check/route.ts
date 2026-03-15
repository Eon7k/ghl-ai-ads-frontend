/**
 * Simple check: can the Vercel server reach your Render backend?
 * Open: https://your-app.vercel.app/api/backend-check
 * Use this to debug 502s when BACKEND_URL is already set.
 */

const TIMEOUT_MS = 35000;

export async function GET() {
  const base =
    (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(
      /\/$/,
      ""
    );

  if (!base || base.startsWith("http://localhost")) {
    return Response.json({
      ok: false,
      error: "BACKEND_URL (or NEXT_PUBLIC_API_URL) is not set in Vercel.",
      hint: "Add it in Vercel → Project → Settings → Environment Variables, then redeploy.",
    });
  }

  try {
    const url = `${base}/experiments`;
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return Response.json({
      ok: true,
      message: "Backend is reachable from Vercel.",
      backendStatus: res.status,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.cause instanceof Error
          ? `${err.message}: ${err.cause.message}`
          : err.message
        : "Request failed";
    const isTimeout =
      err instanceof Error &&
      (err.name === "TimeoutError" || (err.message && err.message.includes("timeout")));
    return Response.json({
      ok: false,
      error: message,
      hint: isTimeout
        ? "Render may be waking up (free tier). Wait 30–60 seconds and try again, or check the backend URL."
        : "Check that BACKEND_URL is exactly your Render URL (no trailing slash) and that the service is running on Render.",
    });
  }
}
