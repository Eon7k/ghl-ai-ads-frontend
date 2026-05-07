/** Connectivity check between this deployment and the configured API URL. */
export const maxDuration = 60;

const TIMEOUT_MS = 58_000;

export async function GET() {
  const base =
    (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(
      /\/$/,
      ""
    );

  if (!base || base.startsWith("http://localhost")) {
    return Response.json({
      ok: false,
      error: "This check could not reach a configured backend URL.",
      hint:
        process.env.NODE_ENV === "development"
          ? "For local debugging: set BACKEND_URL or NEXT_PUBLIC_API_URL."
          : "If you are troubleshooting deployment, verify environment variables with your administrator.",
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
      message: "Backend responded successfully.",
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
        ? "The server may still be starting. Wait a minute and try again, or contact your administrator if it persists."
        : "Contact your administrator so they can confirm the API URL and that the service is running.",
    });
  }
}
