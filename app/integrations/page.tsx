"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getToken } from "@/lib/auth";
import { api, type ConnectedIntegration, type MetaAdAccount } from "@/lib/api";
import AppNav from "@/components/AppNav";
import { IntegrationLogo } from "@/components/IntegrationLogo";

const BACKEND_URL =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ""
    : "";

const INTEGRATIONS: { id: "meta" | "google" | "tiktok"; name: string; description: string }[] = [
  { id: "meta", name: "Meta (Facebook & Instagram)", description: "Run and track campaigns on Facebook and Instagram." },
  { id: "google", name: "Google Ads", description: "Manage search and display campaigns on Google." },
  { id: "tiktok", name: "TikTok Ads", description: "Reach audiences on TikTok with video ads." },
];

export default function IntegrationsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<ConnectedIntegration[]>([]);
  const [metaAdAccounts, setMetaAdAccounts] = useState<MetaAdAccount[] | null>(null);
  const [tiktokAdAccounts, setTiktokAdAccounts] = useState<MetaAdAccount[] | null>(null);
  const [googleAdAccounts, setGoogleAdAccounts] = useState<MetaAdAccount[] | null>(null);
  const [loadingAdAccounts, setLoadingAdAccounts] = useState(false);
  const [loadingTiktokAdAccounts, setLoadingTiktokAdAccounts] = useState(false);
  const [loadingGoogleAdAccounts, setLoadingGoogleAdAccounts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const connectedParam = searchParams.get("connected");
  const errorParam = searchParams.get("error");
  const hasMeta = integrations.some((i) => i.platform === "meta");
  const hasTiktok = integrations.some((i) => i.platform === "tiktok");
  const hasGoogle = integrations.some((i) => i.platform === "google");

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

  async function loadTiktokAdAccounts() {
    setLoadingTiktokAdAccounts(true);
    setError(null);
    try {
      const list = await api.integrations.getTiktokAdAccounts();
      setTiktokAdAccounts(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load ad accounts");
      setTiktokAdAccounts([]);
    } finally {
      setLoadingTiktokAdAccounts(false);
    }
  }

  useEffect(() => {
    if (!hasTiktok) return;
    let cancelled = false;
    (async () => {
      setLoadingTiktokAdAccounts(true);
      try {
        const list = await api.integrations.getTiktokAdAccounts();
        if (!cancelled) setTiktokAdAccounts(list);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load TikTok ad accounts");
          setTiktokAdAccounts([]);
        }
      } finally {
        if (!cancelled) setLoadingTiktokAdAccounts(false);
      }
    })();
    return () => { cancelled = true; };
  }, [hasTiktok]);

  async function loadGoogleAdAccounts() {
    setLoadingGoogleAdAccounts(true);
    setError(null);
    try {
      const list = await api.integrations.getGoogleAdAccounts();
      setGoogleAdAccounts(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Google ad accounts");
      setGoogleAdAccounts([]);
    } finally {
      setLoadingGoogleAdAccounts(false);
    }
  }

  useEffect(() => {
    if (!hasGoogle) return;
    let cancelled = false;
    (async () => {
      setLoadingGoogleAdAccounts(true);
      try {
        const list = await api.integrations.getGoogleAdAccounts();
        if (!cancelled) setGoogleAdAccounts(list);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load Google ad accounts");
          setGoogleAdAccounts([]);
        }
      } finally {
        if (!cancelled) setLoadingGoogleAdAccounts(false);
      }
    })();
    return () => { cancelled = true; };
  }, [hasGoogle]);

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

  function connectTiktok() {
    const token = getToken();
    if (!token) return;
    const url = `${BACKEND_URL.replace(/\/$/, "")}/integrations/tiktok/connect?token=${encodeURIComponent(token)}`;
    window.location.href = url;
  }

  function connectGoogle() {
    const token = getToken();
    if (!token) return;
    const url = `${BACKEND_URL.replace(/\/$/, "")}/integrations/google/connect?token=${encodeURIComponent(token)}`;
    window.location.href = url;
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppNav />
      <div className="mx-auto max-w-3xl p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Integrations</h1>
          <p className="mt-1 text-zinc-600">
            Link your ad accounts so you can launch and manage campaigns from here.
          </p>
        </div>

        {connectedParam === "meta" && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Meta account connected. You can now launch Meta campaigns from here.
          </div>
        )}
        {connectedParam === "tiktok" && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            TikTok account connected. You can now launch TikTok campaigns from here.
          </div>
        )}
        {connectedParam === "google" && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Google account connected. You can now use Google Ads when launching campaigns.
          </div>
        )}
        {errorParam && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {decodeURIComponent(errorParam)}
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {INTEGRATIONS.map((integration) => {
              const connected = integrations.find((i) => i.platform === integration.id);
              const isMeta = integration.id === "meta";
              const isTiktok = integration.id === "tiktok";
              const isGoogle = integration.id === "google";

              return (
                <div
                  key={integration.id}
                  className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
                >
                  {/* Title card with logo */}
                  <div className="flex items-center gap-4 border-b border-zinc-100 bg-zinc-50/50 px-5 py-4">
                    <IntegrationLogo platform={integration.id} size={44} className="rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold text-zinc-900">{integration.name}</h2>
                      <p className="mt-0.5 text-sm text-zinc-500">{integration.description}</p>
                    </div>
                    {connected && (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                        Connected
                      </span>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="p-5">
                    {isMeta && (
                      <>
                        {connected ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-zinc-600">
                                {connected.platformAccountName
                                  ? `Connected as ${connected.platformAccountName}`
                                  : "Account connected"}
                              </p>
                              <button
                                type="button"
                                onClick={() => handleDisconnect(connected.id)}
                                disabled={disconnecting === connected.id}
                                className="text-sm text-red-600 hover:underline disabled:opacity-50"
                              >
                                {disconnecting === connected.id ? "Disconnecting…" : "Disconnect"}
                              </button>
                            </div>
                            {hasMeta && (
                              <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4">
                                <h3 className="text-sm font-medium text-zinc-700">Meta ad accounts</h3>
                                <p className="mt-1 text-xs text-zinc-500">
                                  Ad accounts you can use when launching campaigns to Meta.
                                </p>
                                {loadingAdAccounts ? (
                                  <p className="mt-3 text-sm text-zinc-500">Loading ad accounts…</p>
                                ) : metaAdAccounts !== null ? (
                                  metaAdAccounts.length === 0 ? (
                                    <p className="mt-3 text-sm text-zinc-500">
                                      No ad accounts found, or token may need re-authorization.{" "}
                                      <button
                                        type="button"
                                        onClick={loadMetaAdAccounts}
                                        className="text-blue-600 hover:underline"
                                      >
                                        Try again
                                      </button>
                                    </p>
                                  ) : (
                                    <ul className="mt-3 space-y-2">
                                      {metaAdAccounts.map((a) => (
                                        <li
                                          key={a.id}
                                          className="flex items-center justify-between rounded-md border border-zinc-100 bg-white px-3 py-2 text-sm"
                                        >
                                          <span className="font-medium text-zinc-900">{a.name}</span>
                                          <span className="text-zinc-500">({a.accountId})</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )
                                ) : null}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <p className="text-sm text-zinc-600">
                              Sign in with Facebook to connect your Meta ad account. We only use this to run and manage your ads.
                            </p>
                            <button
                              type="button"
                              onClick={connectMeta}
                              disabled={!BACKEND_URL}
                              className="rounded-lg bg-[#1877F2] px-5 py-2.5 font-medium text-white hover:bg-[#166FE5] disabled:opacity-50"
                            >
                              Connect Meta
                            </button>
                          </div>
                        )}
                        {!BACKEND_URL && !connected && (
                          <p className="mt-3 text-sm text-amber-700">
                            Set NEXT_PUBLIC_BACKEND_URL (or NEXT_PUBLIC_API_URL) in Vercel to your Render backend URL to enable Connect.
                          </p>
                        )}
                      </>
                    )}

                    {isTiktok && (
                      <>
                        {connected ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-zinc-600">
                                {connected.platformAccountName
                                  ? `Connected as ${connected.platformAccountName}`
                                  : "TikTok account connected"}
                              </p>
                              <button
                                type="button"
                                onClick={() => handleDisconnect(connected.id)}
                                disabled={disconnecting === connected.id}
                                className="text-sm text-red-600 hover:underline disabled:opacity-50"
                              >
                                {disconnecting === connected.id ? "Disconnecting…" : "Disconnect"}
                              </button>
                            </div>
                            {hasTiktok && (
                              <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4">
                                <h3 className="text-sm font-medium text-zinc-700">TikTok ad accounts</h3>
                                <p className="mt-1 text-xs text-zinc-500">
                                  Advertiser accounts you can use when launching campaigns to TikTok.
                                </p>
                                {loadingTiktokAdAccounts ? (
                                  <p className="mt-3 text-sm text-zinc-500">Loading ad accounts…</p>
                                ) : tiktokAdAccounts !== null ? (
                                  tiktokAdAccounts.length === 0 ? (
                                    <p className="mt-3 text-sm text-zinc-500">
                                      No ad accounts found, or token may need re-authorization.{" "}
                                      <button
                                        type="button"
                                        onClick={loadTiktokAdAccounts}
                                        className="text-blue-600 hover:underline"
                                      >
                                        Try again
                                      </button>
                                    </p>
                                  ) : (
                                    <ul className="mt-3 space-y-2">
                                      {tiktokAdAccounts.map((a) => (
                                        <li
                                          key={a.id}
                                          className="flex items-center justify-between rounded-md border border-zinc-100 bg-white px-3 py-2 text-sm"
                                        >
                                          <span className="font-medium text-zinc-900">{a.name}</span>
                                          <span className="text-zinc-500">({a.accountId})</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )
                                ) : null}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <p className="text-sm text-zinc-600">
                              Sign in with TikTok to connect your ad account. We only use this to run and manage your TikTok ads.
                            </p>
                            <button
                              type="button"
                              onClick={connectTiktok}
                              disabled={!BACKEND_URL}
                              className="rounded-lg bg-black px-5 py-2.5 font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                            >
                              Connect TikTok
                            </button>
                          </div>
                        )}
                        {!BACKEND_URL && !connected && (
                          <p className="mt-3 text-sm text-amber-700">
                            Set NEXT_PUBLIC_BACKEND_URL (or NEXT_PUBLIC_API_URL) in Vercel to your Render backend URL to enable Connect.
                          </p>
                        )}
                      </>
                    )}

                    {isGoogle && (
                      <>
                        {connected ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-zinc-600">
                                {connected.platformAccountName
                                  ? `Connected as ${connected.platformAccountName}`
                                  : "Google account connected"}
                              </p>
                              <button
                                type="button"
                                onClick={() => handleDisconnect(connected.id)}
                                disabled={disconnecting === connected.id}
                                className="text-sm text-red-600 hover:underline disabled:opacity-50"
                              >
                                {disconnecting === connected.id ? "Disconnecting…" : "Disconnect"}
                              </button>
                            </div>
                            {hasGoogle && (
                              <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4">
                                <h3 className="text-sm font-medium text-zinc-700">Google Ads customer accounts</h3>
                                <p className="mt-1 text-xs text-zinc-500">
                                  Accounts you can use when launching campaigns to Google Ads.
                                </p>
                                {loadingGoogleAdAccounts ? (
                                  <p className="mt-3 text-sm text-zinc-500">Loading ad accounts…</p>
                                ) : googleAdAccounts !== null ? (
                                  googleAdAccounts.length === 0 ? (
                                    <p className="mt-3 text-sm text-zinc-500">
                                      No accounts found, or developer token may not be configured on the server.{" "}
                                      <button
                                        type="button"
                                        onClick={loadGoogleAdAccounts}
                                        className="text-blue-600 hover:underline"
                                      >
                                        Try again
                                      </button>
                                    </p>
                                  ) : (
                                    <ul className="mt-3 space-y-2">
                                      {googleAdAccounts.map((a) => (
                                        <li
                                          key={a.id}
                                          className="flex items-center justify-between rounded-md border border-zinc-100 bg-white px-3 py-2 text-sm"
                                        >
                                          <span className="font-medium text-zinc-900">{a.name}</span>
                                          <span className="text-zinc-500">({a.accountId})</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )
                                ) : null}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <p className="text-sm text-zinc-600">
                              Sign in with Google to connect your Google Ads account. We only use this to run and manage your Google Ads.
                            </p>
                            <button
                              type="button"
                              onClick={connectGoogle}
                              disabled={!BACKEND_URL}
                              className="rounded-lg bg-[#4285F4] px-5 py-2.5 font-medium text-white hover:bg-[#3367D6] disabled:opacity-50"
                            >
                              Connect Google
                            </button>
                          </div>
                        )}
                        {!BACKEND_URL && !connected && (
                          <p className="mt-3 text-sm text-amber-700">
                            Set NEXT_PUBLIC_BACKEND_URL (or NEXT_PUBLIC_API_URL) in Vercel to your Render backend URL to enable Connect.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
