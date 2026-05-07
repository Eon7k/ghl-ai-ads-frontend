"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CheckResult = {
  ok: boolean;
  message?: string;
  error?: string;
  hint?: string;
  backendStatus?: number;
};

export default function BackendCheckPage() {
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(true);

  async function runCheck() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/backend-check");
      const data = await res.json().catch(() => ({}));
      setResult(data);
    } catch {
      setResult({
        ok: false,
        error: "Could not run the check.",
        hint: "Use the URL your team gave you (not an old bookmark) and try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runCheck();
  }, []);

  return (
    <main id="main-content" className="min-h-screen bg-zinc-50 p-6 font-sans">
      <div className="mx-auto max-w-lg">
        <Link href="/" className="text-blue-600 underline hover:no-underline">
          ← Back to home
        </Link>

        <h1 className="mt-6 text-2xl font-bold text-zinc-900">Connection status</h1>
        <p className="mt-2 text-zinc-600">
          This diagnostic checks whether your browser session can reach the product&apos;s application server through the
          same site you loaded.
        </p>

        {loading && (
          <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6 text-center text-zinc-600">Checking…</div>
        )}

        {!loading && result && (
          <div className="mt-8 space-y-6">
            {result.ok ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-6">
                <p className="text-lg font-semibold text-green-800">Backend is reachable</p>
                <p className="mt-2 text-green-700">
                  {result.message || "The application server responded to the check."}
                </p>
                {result.backendStatus != null && (
                  <p className="mt-2 text-sm text-green-700">HTTP status from API: {result.backendStatus}</p>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-red-200 bg-red-50 p-6">
                <p className="text-lg font-semibold text-red-800">Could not verify connection</p>
                {result.error && (
                  <p className="mt-2 text-red-700">
                    <strong>What went wrong:</strong> {result.error}
                  </p>
                )}
                {result.hint && (
                  <div className="mt-4 rounded border border-red-200 bg-white p-4">
                    <p className="font-semibold text-red-800">Next steps:</p>
                    <p className="mt-1 text-red-700">{result.hint}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={runCheck}
                  className="mt-4 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
                >
                  Try again
                </button>
              </div>
            )}

            <div className="rounded-lg border border-zinc-200 bg-white p-6">
              <p className="font-semibold text-zinc-900">If problems continue</p>
              <ul className="mt-3 list-inside list-disc space-y-2 text-zinc-700">
                <li>
                  Retry after a minute in case the service was still starting (<strong>Try again</strong> above).
                </li>
                <li>Open the Help page from the top bar—there&apos;s troubleshooting for integrations and launches.</li>
                <li>Contact whoever administers your account so they can review hosting logs and integrations.</li>
              </ul>
            </div>

            <Link href="/" className="mt-4 inline-block text-blue-600 underline hover:no-underline">
              Go to Home
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
