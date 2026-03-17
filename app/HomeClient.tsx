"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getToken } from "@/lib/auth";
import { api } from "@/lib/api";
import type { MetaAdAccount } from "@/lib/api";
import { IntegrationLogo } from "@/components/IntegrationLogo";
import type { Experiment } from "@/lib/types";
import type { ConnectedIntegration } from "@/lib/api";
import AppNav from "@/components/AppNav";

const BACKEND_URL =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ""
    : "";

const PLATFORMS: { id: "meta" | "google" | "tiktok"; name: string }[] = [
  { id: "meta", name: "Meta (Facebook & Instagram)" },
  { id: "google", name: "Google Ads" },
  { id: "tiktok", name: "TikTok Ads" },
];

export function HomeClient() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [campaigns, setCampaigns] = useState<Experiment[]>([]);
  const [integrations, setIntegrations] = useState<ConnectedIntegration[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<("meta" | "google" | "tiktok")[]>(["meta"]);
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("30");
  const [prompt, setPrompt] = useState("");
  const [variantCount, setVariantCount] = useState(10);
  const [creativesSource, setCreativesSource] = useState<"ai" | "own">("ai");
  const [aiCreativePercent, setAiCreativePercent] = useState(0);
  const [creativePrompt, setCreativePrompt] = useState("");
  const [aiProvider, setAiProvider] = useState<"openai" | "anthropic" | "split">("split");
  const [createLoading, setCreateLoading] = useState(false);
  const [createStatus, setCreateStatus] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [metaAdAccounts, setMetaAdAccounts] = useState<MetaAdAccount[] | null>(null);
  const [tiktokAdAccounts, setTiktokAdAccounts] = useState<MetaAdAccount[] | null>(null);
  const [googleAdAccounts, setGoogleAdAccounts] = useState<MetaAdAccount[] | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [expandedPlatform, setExpandedPlatform] = useState<"meta" | "google" | "tiktok" | null>(null);

  const searchParams = useSearchParams();
  const connectedParam = searchParams.get("connected");
  const errorParam = searchParams.get("error");
  const connectedPlatforms = PLATFORMS.filter((p) => integrations.some((i) => i.platform === p.id));

  useEffect(() => {
    if (!user) return;
    setCampaignsLoading(true);
    api.listExperiments().then(setCampaigns).catch(() => setCampaigns([])).finally(() => setCampaignsLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setIntegrationsLoading(true);
    api.integrations.list().then(setIntegrations).catch(() => setIntegrations([])).finally(() => setIntegrationsLoading(false));
  }, [user, connectedParam]);

  useEffect(() => {
    if (!integrations.some((i) => i.platform === "meta")) return;
    api.integrations.getMetaAdAccounts().then(setMetaAdAccounts).catch(() => setMetaAdAccounts([]));
  }, [integrations]);
  useEffect(() => {
    if (!integrations.some((i) => i.platform === "tiktok")) return;
    api.integrations.getTiktokAdAccounts().then(setTiktokAdAccounts).catch(() => setTiktokAdAccounts([]));
  }, [integrations]);
  useEffect(() => {
    if (!integrations.some((i) => i.platform === "google")) return;
    api.integrations.getGoogleAdAccounts().then(setGoogleAdAccounts).catch(() => setGoogleAdAccounts([]));
  }, [integrations]);

  useEffect(() => {
    if (searchParams.get("open") === "create") setCreateOpen(true);
  }, [searchParams]);

  async function handleDisconnect(id: string) {
    setDisconnecting(id);
    try {
      await api.integrations.disconnect(id);
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
      setExpandedPlatform(null);
    } catch {
      // ignore
    } finally {
      setDisconnecting(null);
    }
  }

  function getAdAccounts(platform: "meta" | "google" | "tiktok"): MetaAdAccount[] | null {
    if (platform === "meta") return metaAdAccounts;
    if (platform === "tiktok") return tiktokAdAccounts;
    return googleAdAccounts;
  }

  function togglePlatform(p: "meta" | "google" | "tiktok") {
    const connected = integrations.some((i) => i.platform === p);
    if (!connected) return;
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  function connectTo(platform: "meta" | "google" | "tiktok") {
    const token = getToken();
    if (!token) return;
    const path = `/integrations/${platform}/connect?token=${encodeURIComponent(token)}`;
    window.location.href = `${BACKEND_URL.replace(/\/$/, "")}${path}`;
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);
    setCreateStatus("Creating campaign…");
    const totalDailyBudget = Number(budget);
    const count = Number(variantCount);
    if (count < 1 || count > 20) {
      setCreateError("Number of ad variants must be between 1 and 20.");
      setCreateLoading(false);
      setCreateStatus("");
      return;
    }
    const platformsToUse = selectedPlatforms.length > 0 ? selectedPlatforms : (connectedPlatforms[0] ? [connectedPlatforms[0].id] : []);
    if (platformsToUse.length === 0) {
      setCreateError("Select at least one platform (or connect one in the bar above).");
      setCreateLoading(false);
      setCreateStatus("");
      return;
    }

    try {
      const experiment = await api.createExperiment({
        name,
        platform: platformsToUse[0],
        platforms: platformsToUse.length > 1 ? platformsToUse : undefined,
        totalDailyBudget,
        prompt: prompt.trim() || "Generate varied ad copy for this campaign.",
        variantCount: count,
        creativesSource,
        aiProvider: creativesSource === "ai" ? aiProvider : undefined,
        creativePrompt: creativePrompt.trim() || undefined,
      });

      const variants = experiment.variants || [];
      const createdIds = (experiment as Experiment & { createdExperimentIds?: string[] }).createdExperimentIds || [experiment.id];
      const creativeCount = Math.min(Math.round((variants.length * aiCreativePercent) / 100), variants.length);

      if (creativeCount > 0) {
        for (let i = 0; i < creativeCount; i++) {
          setCreateStatus(`Generating creatives ${i + 1} of ${creativeCount}…`);
          try {
            await api.generateVariantCreative(experiment.id, variants[i].id);
          } catch {
            // continue
          }
        }
      }

      setCreateOpen(false);
      setCreateLoading(false);
      setCreateStatus("");
      setCampaigns((prev) => [...prev, experiment]);
      if (createdIds.length > 1) {
        setCampaignsLoading(true);
        api.listExperiments().then(setCampaigns).finally(() => setCampaignsLoading(false));
      }
      router.push(`/campaigns/${experiment.id}`);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setCreateLoading(false);
      setCreateStatus("");
    }
  }

  function resetCreateForm() {
    setName("");
    setBudget("30");
    setPrompt("");
    setVariantCount(10);
    setCreativesSource("ai");
    setAiCreativePercent(0);
    setCreativePrompt("");
    setAiProvider("split");
    setSelectedPlatforms(connectedPlatforms.length ? [connectedPlatforms[0].id] : []);
    setCreateError(null);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
        <main className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">AI Ad Manager</h1>
          <p className="mt-3 text-zinc-600">
            Create and manage campaigns, generate ad copy with AI, and optimize budgets.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-3.5 font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl border-2 border-zinc-300 bg-white px-8 py-3.5 font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Sign up
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        {/* OAuth callback banners */}
        {connectedParam === "meta" && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">Meta connected. You can launch Meta campaigns below.</div>
        )}
        {connectedParam === "tiktok" && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">TikTok connected. You can launch TikTok campaigns below.</div>
        )}
        {connectedParam === "google" && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">Google connected. You can launch Google Ads campaigns below.</div>
        )}
        {errorParam && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{decodeURIComponent(errorParam)}</div>
        )}

        {/* Integration bar — cards in a row at top */}
        <section className="mb-8">
          <div className="flex flex-wrap gap-3">
            {PLATFORMS.map((p) => {
              const connected = integrations.some((i) => i.platform === p.id);
              const conn = connected ? integrations.find((i) => i.platform === p.id) : null;
              const expanded = expandedPlatform === p.id;
              const adAccounts = getAdAccounts(p.id);
              return (
                <div key={p.id} className="min-w-[160px] flex-1 basis-0 rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                  <div
                    className="flex cursor-pointer items-center gap-3 p-4"
                    onClick={() => connected && setExpandedPlatform(expanded ? null : p.id)}
                  >
                    <IntegrationLogo platform={p.id} size={40} className="shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-zinc-900">{p.name}</p>
                      {connected ? (
                        <span className="text-xs text-green-600">Connected</span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); connectTo(p.id); }}
                          disabled={!BACKEND_URL}
                          className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                    {connected && (
                      <svg className={`h-5 w-5 text-zinc-400 ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>
                  {connected && expanded && conn && (
                    <div className="border-t border-zinc-100 bg-zinc-50/50 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-600">{conn.platformAccountName || "Account connected"}</span>
                        <button
                          type="button"
                          onClick={() => handleDisconnect(conn.id)}
                          disabled={disconnecting === conn.id}
                          className="text-xs text-red-600 hover:underline disabled:opacity-50"
                        >
                          {disconnecting === conn.id ? "Disconnecting…" : "Disconnect"}
                        </button>
                      </div>
                      {adAccounts && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-zinc-600">Ad accounts</p>
                          {adAccounts.length === 0 ? (
                            <p className="mt-1 text-xs text-zinc-500">None found</p>
                          ) : (
                            <ul className="mt-1 space-y-1">
                              {adAccounts.slice(0, 3).map((a) => (
                                <li key={a.id} className="text-xs text-zinc-700 truncate">{a.name}</li>
                              ))}
                              {adAccounts.length > 3 && <li className="text-xs text-zinc-500">+{adAccounts.length - 3} more</li>}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {!BACKEND_URL && (
            <p className="mt-2 text-sm text-amber-700">Set NEXT_PUBLIC_BACKEND_URL to enable Connect.</p>
          )}
        </section>

        {/* Launch a campaign */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-900">Launch a campaign</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Choose one or more platforms to run the same campaign on.
          </p>

          {/* Platform multi-select */}
          <div className="mt-3 flex flex-wrap gap-3">
            {PLATFORMS.map((p) => {
              const connected = integrations.some((i) => i.platform === p.id);
              const selected = selectedPlatforms.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => connected && togglePlatform(p.id)}
                  disabled={!connected}
                  className={`flex items-center gap-2 rounded-xl border-2 px-4 py-3 transition ${
                    connected
                      ? selected
                        ? "border-blue-500 bg-blue-50"
                        : "border-zinc-200 bg-white hover:border-zinc-300"
                      : "cursor-not-allowed border-zinc-100 bg-zinc-50 opacity-60"
                  }`}
                >
                  <IntegrationLogo platform={p.id} size={28} />
                  <span className="font-medium text-zinc-900">{p.name}</span>
                  {selected && <span className="text-blue-600">✓</span>}
                </button>
              );
            })}
          </div>

          {connectedPlatforms.length === 0 && (
            <p className="mt-3 text-sm text-amber-700">Connect at least one platform above to create a campaign.</p>
          )}

          {/* Create form (expandable) */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                setCreateOpen((o) => !o);
                if (!createOpen) resetCreateForm();
              }}
              disabled={connectedPlatforms.length === 0}
              className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 text-left shadow-sm hover:border-zinc-300 hover:shadow-md disabled:opacity-60"
            >
              <span className="font-semibold text-zinc-900">New campaign</span>
              <svg className={`h-5 w-5 text-zinc-500 ${createOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {createOpen && (
              <div className="mt-2 overflow-hidden rounded-b-xl border border-t-0 border-zinc-200 bg-white p-5 shadow-sm">
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  {createError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{createError}</div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700">Campaign name</label>
                    <input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer Sale" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700">Creatives</label>
                    <div className="mt-1 flex gap-4">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input type="radio" name="creativesSource" checked={creativesSource === "ai"} onChange={() => setCreativesSource("ai")} className="rounded" />
                        <span className="text-sm">AI-generated</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input type="radio" name="creativesSource" checked={creativesSource === "own"} onChange={() => setCreativesSource("own")} className="rounded" />
                        <span className="text-sm">My own copy</span>
                      </label>
                    </div>
                  </div>
                  {creativesSource === "ai" && (
                    <div>
                      <label className="block text-sm font-medium text-zinc-700">Ad copy AI</label>
                      <select className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" value={aiProvider} onChange={(e) => setAiProvider(e.target.value as "openai" | "anthropic" | "split")}>
                        <option value="openai">OpenAI only</option>
                        <option value="anthropic">Anthropic only</option>
                        <option value="split">Split (half each)</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700">Ad idea / prompt</label>
                    <textarea className="mt-1 min-h-[80px] w-full rounded-lg border border-zinc-300 px-3 py-2" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. Pain-free dental implants, same-day results." required={creativesSource === "ai"} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700">Variants</label>
                    <input type="number" min={1} max={20} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" value={variantCount} onChange={(e) => setVariantCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700">AI images % of variants: {aiCreativePercent}%</label>
                    <input type="range" min={0} max={100} value={aiCreativePercent} onChange={(e) => setAiCreativePercent(Number(e.target.value))} className="mt-1 h-2 w-full accent-violet-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700">Creative description (optional)</label>
                    <textarea className="mt-1 min-h-[60px] w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" value={creativePrompt} onChange={(e) => setCreativePrompt(e.target.value)} placeholder="How the ad image should look" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700">Daily budget: ${budget}</label>
                    <input type="range" min={5} max={500} step={5} value={budget} onChange={(e) => setBudget(e.target.value)} className="mt-1 h-2 w-full accent-blue-600" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={createLoading || selectedPlatforms.length === 0} className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                      {createLoading ? createStatus || "Creating…" : selectedPlatforms.length > 1 ? `Create on ${selectedPlatforms.length} platforms` : "Create campaign"}
                    </button>
                    <button type="button" onClick={() => setCreateOpen(false)} disabled={createLoading} className="rounded-lg border border-zinc-300 bg-white px-5 py-2.5 font-medium text-zinc-700 hover:bg-zinc-50">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </section>

        {/* Campaign list */}
        <section id="campaigns">
          <h2 className="text-lg font-semibold text-zinc-900">Your campaigns</h2>
          {campaignsLoading ? (
            <div className="mt-4 flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
            </div>
          ) : campaigns.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">No campaigns yet. Use “New campaign” above to create one.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {campaigns.map((c) => (
                <li key={c.id}>
                  <Link href={`/campaigns/${c.id}`} className="block rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm transition hover:border-zinc-300 hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-zinc-900">{c.name}</p>
                        <p className="text-sm text-zinc-500">
                          {c.platform.charAt(0).toUpperCase() + c.platform.slice(1)} · ${c.totalDailyBudget}/day
                          {c.variantCount != null && ` · ${c.variantCount} variant${c.variantCount === 1 ? "" : "s"}`}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${c.status === "launched" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                        {c.status === "draft" ? "Draft" : "Launched"}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
