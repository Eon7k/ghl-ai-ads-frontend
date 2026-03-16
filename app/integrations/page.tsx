"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getToken } from "@/lib/auth";
import { api, type ConnectedIntegration, type MetaAdAccount } from "@/lib/api";
import AppNav from "@/components/AppNav";

const BACKEND_URL =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ""
    : "";

export default function IntegrationsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<ConnectedIntegration[]>([]);
  const [metaAdAccounts, setMetaAdAccounts] = useState<MetaAdAccount[] | null>(null);
  const [loadingAdAccounts, setLoadingAdAccounts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const connectedParam = searchParams.get("connected");
  const errorParam = searchParams.get("error");
  const hasMeta = integrations.some((i) => i.platform === "meta");

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

  async function loadMetaAdAccounts() {
    setLoadingAdAccounts(true);
    setError(null);
    try {
      const list = await api.integrations.getMetaAdAccounts();
      setMetaAdAccounts(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load ad accounts");
      setMetaAdAccounts([]);
    } finally {
      setLoadingAdAccounts(false);
    }
  }

  useEffect(() => {
    if (!hasMeta) return;
    let cancelled = false;
    (async () => {
      setLoadingAdAccounts(true);
      try {
        const list = await api.integrations.getMetaAdAccounts();
        if (!cancelled) setMetaAdAccounts(list);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load ad accounts");
          setMetaAdAccounts([]);
        }
      } finally {
        if (!cancelled) setLoadingAdAccounts(false);
      }
    })();
    return () => { cancelled = true; };
  }, [hasMeta]);

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
    <div className="min-h-screen bg-zinc-50">
      <AppNav />
      <div className="mx-auto max-w-2xl p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900">Integrations</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Link your ad accounts so you can launch and manage campaigns from here.
          </p>
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

            {hasMeta && (
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-zinc-900">Meta ad accounts</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Ad accounts you can use when launching experiments to Meta.
                </p>
                {loadingAdAccounts ? (
                  <p className="mt-3 text-sm text-zinc-500">Loading ad accounts…</p>
                ) : metaAdAccounts !== null ? (
                  metaAdAccounts.length === 0 ? (
                    <p className="mt-3 text-sm text-zinc-500">
                      No ad accounts found, or token may need re-authorization.{" "}
                      <button type="button" onClick={loadMetaAdAccounts} className="text-blue-600 hover:underline">
                        Try again
                      </button>
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {metaAdAccounts.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3"
                        >
                          <div>
                            <span className="font-medium text-zinc-900">{a.name}</span>
                            <span className="ml-2 text-sm text-zinc-500">({a.accountId})</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )
                ) : null}
              </div>
            )}

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
