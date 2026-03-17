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
        hint: "Make sure you're on the same site (e.g. your Vercel or custom domain).",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runCheck();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans">
      <div className="mx-auto max-w-lg">
        <Link
          href="/"
          className="text-blue-600 underline hover:no-underline"
        >
          ← Back to home
        </Link>

        <h1 className="mt-6 text-2xl font-bold text-zinc-900">
          Backend connection status
        </h1>
        <p className="mt-2 text-zinc-600">
          This page checks whether your frontend (Vercel) can reach your backend (Render).
        </p>

        {loading && (
          <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6 text-center text-zinc-600">
            Checking…
          </div>
        )}

        {!loading && result && (
          <div className="mt-8 space-y-6">
            {result.ok ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-6">
                <p className="text-lg font-semibold text-green-800">
                  Backend is connected
                </p>
                <p className="mt-2 text-green-700">
                  {result.message || "Your frontend can reach your backend."}
                </p>
                {result.backendStatus != null && (
                  <p className="mt-2 text-sm text-green-600">
                    Backend responded with status: {result.backendStatus}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-red-200 bg-red-50 p-6">
                <p className="text-lg font-semibold text-red-800">
                  Backend is not connected
                </p>
                {result.error && (
                  <p className="mt-2 text-red-700">
                    <strong>What went wrong:</strong> {result.error}
                  </p>
                )}
                {result.hint && (
                  <div className="mt-4 rounded border border-red-200 bg-white p-4">
                    <p className="font-semibold text-red-800">What to do:</p>
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
              <p className="font-semibold text-zinc-900">If it still fails, do this:</p>
              <ol className="mt-3 list-inside list-decimal space-y-2 text-zinc-700">
                <li>
                  In <strong>Vercel</strong>, go to your project → <strong>Settings</strong> → <strong>Environment Variables</strong>.
                </li>
                <li>
                  Make sure <strong>BACKEND_URL</strong> is set to your Render URL (e.g. <code className="rounded bg-zinc-100 px-1">https://your-app.onrender.com</code>) with <strong>no slash at the end</strong>.
                </li>
                <li>
                  If you changed it, go to <strong>Deployments</strong> → click the ⋮ on the latest one → <strong>Redeploy</strong>.
                </li>
                <li>
                  On Render’s free tier, the backend can “sleep”. Wait 30–60 seconds and click <strong>Try again</strong> above.
                </li>
              </ol>
            </div>

        <Link
          href="/"
          className="inline-block mt-4 text-blue-600 underline hover:no-underline"
        >
          Go to Home
        </Link>
          </div>
        )}
      </div>
    </div>
  );
}
