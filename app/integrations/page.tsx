"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getToken } from "@/lib/auth";
import { api, type ConnectedIntegration } from "@/lib/api";

const BACKEND_URL =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ""
    : "";

export default function IntegrationsPage() {
  const { user, logout } = useAuth();
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<ConnectedIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const connectedParam = searchParams.get("connected");
  const errorParam = searchParams.get("error");

  useEffect(() => {
    async function fetchIntegrations() {
      try {
        const list = await api.integrations.list();
        setIntegrations(list);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    fetchIntegrations();
  }, [connectedParam]);

  async function handleDisconnect(id: string) {
    setDisconnecting(id);
    try {
      await api.integrations.disconnect(id);
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to disconnect");
    } finally {
      setDisconnecting(null);
    }
  }

  function connectMeta() {
    const token = getToken();
    if (!token) return;
    const url = `${BACKEND_URL.replace(/\/$/, "")}/integrations/meta/connect?token=${encodeURIComponent(token)}`;
    window.location.href = url;
  }

  const platformLabel: Record<string, string> = {
    meta: "Meta (Facebook & Instagram)",
    tiktok: "TikTok",
    google: "Google Ads",
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Connected accounts</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Link your ad accounts so you can launch and manage campaigns from here.
            </p>
            {user && (
              <p className="mt-1 text-sm text-zinc-500">
                {user.email}
                <button
                  type="button"
                  onClick={logout}
                  className="ml-2 text-blue-600 hover:underline"
                >
                  Log out
                </button>
              </p>
            )}
          </div>
          <Link
            href="/experiments"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            ← Experiments
          </Link>
        </div>

        {connectedParam === "meta" && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Meta account connected. You can now launch Meta campaigns from an experiment.
          </div>
        )}
        {errorParam && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {decodeURIComponent(errorParam)}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-zinc-500">Loading…</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">Connected</h2>
              {integrations.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-500">No accounts connected yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {integrations.map((i) => (
                    <li
                      key={i.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3"
                    >
                      <div>
                        <span className="font-medium">{platformLabel[i.platform] || i.platform}</span>
                        {i.platformAccountName && (
                          <span className="ml-2 text-sm text-zinc-500">— {i.platformAccountName}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDisconnect(i.id)}
                        disabled={disconnecting === i.id}
                        className="text-sm text-red-600 hover:underline disabled:opacity-50"
                      >
                        {disconnecting === i.id ? "Disconnecting…" : "Disconnect"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">Connect an account</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Sign in with the platform and approve access. We only use this to run and manage your ads.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={connectMeta}
                  disabled={!BACKEND_URL}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Connect Meta (Facebook & Instagram)
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-lg border border-zinc-300 bg-zinc-100 px-5 py-2.5 font-medium text-zinc-500"
                  title="Coming soon"
                >
                  Connect TikTok (coming soon)
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-lg border border-zinc-300 bg-zinc-100 px-5 py-2.5 font-medium text-zinc-500"
                  title="Coming soon"
                >
                  Connect Google Ads (coming soon)
                </button>
              </div>
              {!BACKEND_URL && (
                <p className="mt-2 text-sm text-amber-700">
                  Set NEXT_PUBLIC_BACKEND_URL (or NEXT_PUBLIC_API_URL) in Vercel to your Render backend URL to enable Connect.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
