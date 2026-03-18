"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, type MetaAdAccount } from "@/lib/api";
import AdPreview from "@/components/AdPreview";
import { useAuth } from "@/contexts/AuthContext";
import type { Experiment, AdVariant } from "@/lib/types";

import type { CampaignMetricsResponse } from "@/lib/api";

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const id = typeof params.id === "string" ? params.id : "";

  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [variantCopies, setVariantCopies] = useState<Record<string, string>>({});
  const [savingVariantId, setSavingVariantId] = useState<string | null>(null);
  const [savedVariantId, setSavedVariantId] = useState<string | null>(null);
  const [regeneratingVariantId, setRegeneratingVariantId] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [creativeUrls, setCreativeUrls] = useState<Record<string, string>>({});
  const [generatingCreativeId, setGeneratingCreativeId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<CampaignMetricsResponse | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [budgetValue, setBudgetValue] = useState<string>("");
  const [budgetUpdating, setBudgetUpdating] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [metaAdAccounts, setMetaAdAccounts] = useState<MetaAdAccount[] | null>(null);
  const [selectedMetaAdAccountId, setSelectedMetaAdAccountId] = useState<string>("");
  const [launchLandingPageUrl, setLaunchLandingPageUrl] = useState<string>("");
  const [launchAsTest, setLaunchAsTest] = useState(false);
  const [metaTestLoading, setMetaTestLoading] = useState(false);
  const [metaTestResult, setMetaTestResult] = useState<{ ok: true; adAccountCount: number } | { ok: false; error: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      try {
        const data = await api.getExperiment(id);
        if (cancelled) return;
        setExperiment(data);
        const copies: Record<string, string> = {};
        (data.variants || []).forEach((v) => {
          const text = (v.copy != null && String(v.copy).trim()) ? String(v.copy).trim() : "";
          copies[v.id] = text || `Variant ${v.index} — Ad copy`;
        });
        setVariantCopies(copies);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load campaign");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  // When server sends empty copy, fill from server + fallback so preview isn't blank on first paint
  useEffect(() => {
    if (!experiment?.variants?.length) return;
    setVariantCopies((prev) => {
      let next: Record<string, string> | null = null;
      for (const v of experiment.variants!) {
        const serverCopy = (v.copy != null && String(v.copy).trim()) ? String(v.copy).trim() : "";
        const fallback = `Variant ${v.index} — Ad copy`;
        const value = serverCopy || fallback;
        const current = prev[v.id];
        if (current === undefined || (typeof current === "string" && !current.trim())) {
          if (!next) next = { ...prev };
          next[v.id] = value;
        }
      }
      return next ?? prev;
    });
  }, [experiment?.id, experiment?.variants]);

  // Load Meta ad accounts when this is a Meta draft (for launch to live)
  useEffect(() => {
    if (!experiment || experiment.platform !== "meta" || experiment.status !== "draft") return;
    api.integrations.getMetaAdAccounts()
      .then(setMetaAdAccounts)
      .catch(() => setMetaAdAccounts([]));
  }, [experiment?.id, experiment?.platform, experiment?.status]);

  // When launched, load metrics from backend (Meta when we have metaCampaignId, else placeholder)
  useEffect(() => {
    if (!experiment || experiment.status !== "launched") {
      setMetrics(null);
      return;
    }
    let cancelled = false;
    setMetricsLoading(true);
    (async () => {
      try {
        const data = await api.getCampaignMetrics(experiment.id);
        if (!cancelled) setMetrics(data);
      } catch {
        if (!cancelled) setMetrics(null);
      } finally {
        if (!cancelled) setMetricsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [experiment?.id, experiment?.status]);

  // Sync budget input when experiment loads
  useEffect(() => {
    if (experiment?.totalDailyBudget != null) {
      setBudgetValue(String(experiment.totalDailyBudget));
    }
  }, [experiment?.id, experiment?.totalDailyBudget]);

  async function handleUpdateStatus(status: "ACTIVE" | "PAUSED") {
    if (!experiment) return;
    setStatusError(null);
    setStatusUpdating(true);
    try {
      await api.updateCampaignStatus(experiment.id, status);
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleUpdateBudget() {
    if (!experiment) return;
    const num = Number(budgetValue);
    if (Number.isNaN(num) || num < 1) {
      setBudgetError("Enter a valid daily budget (min 1)");
      return;
    }
    setBudgetError(null);
    setBudgetUpdating(true);
    try {
      await api.updateCampaignBudget(experiment.id, num);
    } catch (e) {
      setBudgetError(e instanceof Error ? e.message : "Failed to update budget");
    } finally {
      setBudgetUpdating(false);
    }
  }

  const creativeUrlsRef = useRef<Record<string, string>>({});
  useEffect(() => {
    if (!experiment?.variants?.length) return;
    let cancelled = false;
    (async () => {
      const urls: Record<string, string> = {};
      for (const v of experiment.variants!) {
        if (!v.hasCreative) continue;
        try {
          const url = await api.getVariantCreativeBlobUrl(experiment.id, v.id);
          if (!cancelled) urls[v.id] = url;
        } catch {
          // ignore
        }
      }
      if (!cancelled) {
        creativeUrlsRef.current = urls;
        setCreativeUrls((prev) => ({ ...prev, ...urls }));
      }
    })();
    return () => {
      cancelled = true;
      Object.values(creativeUrlsRef.current).forEach(URL.revokeObjectURL);
      creativeUrlsRef.current = {};
    };
  }, [experiment?.id, experiment?.variants?.filter((v) => v.hasCreative).length]);

  const creativeUrlsToRevoke = useRef(creativeUrls);
  creativeUrlsToRevoke.current = creativeUrls;
  useEffect(() => {
    return () => {
      Object.values(creativeUrlsToRevoke.current).forEach(URL.revokeObjectURL);
    };
  }, []);

  async function saveVariant(v: AdVariant) {
    const copy = variantCopies[v.id] ?? v.copy;
    if (copy === v.copy) return;
    setSavingVariantId(v.id);
    setSavedVariantId(null);
    try {
      await api.updateVariant(experiment!.id, v.id, copy);
      setExperiment((prev) => {
        if (!prev?.variants) return prev;
        return {
          ...prev,
          variants: prev.variants!.map((x) => (x.id === v.id ? { ...x, copy } : x)),
        };
      });
      setSavedVariantId(v.id);
      setTimeout(() => setSavedVariantId(null), 2000);
    } catch (e) {
      // Could set a per-variant error; for now we don't
    } finally {
      setSavingVariantId(null);
    }
  }

  async function regenerateVariant(v: AdVariant) {
    if (!experiment) return;
    setRegeneratingVariantId(v.id);
    try {
      const { copy } = await api.regenerateVariant(experiment.id, v.id);
      setVariantCopies((prev) => ({ ...prev, [v.id]: copy }));
      setExperiment((prev) => {
        if (!prev?.variants) return prev;
        return {
          ...prev,
          variants: prev.variants!.map((x) =>
            x.id === v.id ? { ...x, copy, aiSource: "openai" as const } : x
          ),
        };
      });
    } catch (e) {
      // Could show per-variant error
    } finally {
      setRegeneratingVariantId(null);
    }
  }

  async function generateCreative(v: AdVariant) {
    if (!experiment) return;
    setGeneratingCreativeId(v.id);
    try {
      await api.generateVariantCreative(experiment.id, v.id);
      const url = await api.getVariantCreativeBlobUrl(experiment.id, v.id);
      setCreativeUrls((prev) => ({ ...prev, [v.id]: url }));
      setExperiment((prev) => {
        if (!prev?.variants) return prev;
        return {
          ...prev,
          variants: prev.variants!.map((x) => (x.id === v.id ? { ...x, hasCreative: true } : x)),
        };
      });
    } catch (e) {
      // could set per-variant error
    } finally {
      setGeneratingCreativeId(null);
    }
  }

  async function testMetaConnection() {
    setMetaTestLoading(true);
    setMetaTestResult(null);
    try {
      const result = await api.integrations.testMetaConnection();
      setMetaTestResult(result);
    } catch (e) {
      setMetaTestResult({ ok: false, error: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setMetaTestLoading(false);
    }
  }

  async function launch() {
    if (!experiment || experiment.status === "launched") return;
    setLaunching(true);
    setLaunchError(null);
    const countWithCreatives = variants.filter((v) => v.hasCreative || creativeUrls[v.id]).length;
    const opts: { aiCreativeCount: number; metaAdAccountId?: string; landingPageUrl?: string; dryRun?: boolean } = {
      aiCreativeCount: countWithCreatives,
    };
    if (experiment.platform === "meta" && selectedMetaAdAccountId) {
      opts.metaAdAccountId = selectedMetaAdAccountId;
      if (launchLandingPageUrl.trim()) opts.landingPageUrl = launchLandingPageUrl.trim();
      if (launchAsTest) opts.dryRun = true;
    }
    try {
      const updated = await api.launchExperiment(experiment.id, opts);
      setExperiment(updated);
    } catch (e) {
      setLaunchError(e instanceof Error ? e.message : "Failed to launch");
    } finally {
      setLaunching(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-zinc-600">Loading campaign...</p>
      </div>
    );
  }

  if (error || !experiment) {
    return (
      <div className="p-6">
        <Link href="/" className="text-blue-600 hover:underline text-sm block mb-2">
          ← Back to Campaigns
        </Link>
        <p className="text-red-600">{error || "Campaign not found."}</p>
      </div>
    );
  }

  const variants = experiment.variants || [];
  const isDraft = experiment.status === "draft";
  const budgetPerVariant =
    variants.length > 0
      ? Math.round((experiment.totalDailyBudget / variants.length) * 100) / 100
      : null;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4">
        <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline">
          ← Back to Campaigns
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{experiment.name}</h1>
          <p className="text-zinc-600 text-sm mt-1">
            {experiment.platform.toUpperCase()} · ${experiment.totalDailyBudget}/day total
            {variants.length > 0 && ` · ${variants.length} variant${variants.length === 1 ? "" : "s"}`}
            {budgetPerVariant != null && ` · $${budgetPerVariant}/day per variant`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block px-3 py-1 rounded text-sm font-medium ${
              isDraft ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
            }`}
          >
            {experiment.status === "draft" ? "Draft" : "Launched"}
          </span>
          {isDraft && (
            <div className="flex flex-col gap-3">
              {experiment.platform === "meta" && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3">
                  <p className="mb-2 text-sm font-medium text-zinc-700">Launch to Meta (live)</p>
                  {metaAdAccounts === null ? (
                    <p className="text-xs text-zinc-500">Loading ad accounts…</p>
                  ) : metaAdAccounts.length === 0 ? (
                    <p className="text-xs text-amber-700">Connect Meta in Integrations to launch to a real ad account.</p>
                  ) : (
                    <>
                      <label className="block text-xs text-zinc-600">Ad account</label>
                      <select
                        value={selectedMetaAdAccountId}
                        onChange={(e) => setSelectedMetaAdAccountId(e.target.value)}
                        className="mt-0.5 w-full max-w-md rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                      >
                        <option value="">— Don’t create on Meta (draft only) —</option>
                        {metaAdAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.id})
                          </option>
                        ))}
                      </select>
                      {selectedMetaAdAccountId && (
                        <>
                          <label className="mt-2 block text-xs text-zinc-600">Landing page URL (optional)</label>
                          <input
                            type="url"
                            value={launchLandingPageUrl}
                            onChange={(e) => setLaunchLandingPageUrl(e.target.value)}
                            placeholder="https://example.com"
                            className="mt-0.5 w-full max-w-md rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                          />
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-2 text-sm text-zinc-700">
                              <input
                                type="checkbox"
                                checked={launchAsTest}
                                onChange={(e) => setLaunchAsTest(e.target.checked)}
                                className="rounded border-zinc-300"
                              />
                              Launch as test (create on Meta but keep paused — no spend)
                            </label>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={testMetaConnection}
                              disabled={metaTestLoading}
                              className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                            >
                              {metaTestLoading ? "Testing…" : "Test Meta connection"}
                            </button>
                            {metaTestResult && (
                              <span className={`text-xs ${metaTestResult.ok ? "text-green-700" : "text-red-700"}`}>
                                {metaTestResult.ok
                                  ? `Connected — ${metaTestResult.adAccountCount} ad account(s)`
                                  : metaTestResult.error}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={launch}
                  disabled={launching || variants.length === 0}
                  className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {launching
                    ? "Launching…"
                    : experiment.platform === "meta" && selectedMetaAdAccountId
                      ? launchAsTest
                        ? "Launch as test (no spend)"
                        : "Launch to Meta (live)"
                      : "Launch campaign"}
                </button>
                {launchError && (
                  <p className="w-full basis-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {launchError}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Campaign Manager: metrics + adjustments — shown when launched */}
      {experiment.status === "launched" && (
        <>
          <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">Campaign performance</h2>
            {metricsLoading ? (
              <p className="text-sm text-zinc-500">Loading metrics…</p>
            ) : metrics ? (
              <>
                <p className="mb-4 text-xs text-zinc-500">
                  {metrics.source === "meta"
                    ? `Metrics from Meta${metrics.datePreset ? ` (${metrics.datePreset})` : ""}. All values match what Meta tracks.`
                    : "Connect Meta and launch to the platform to see live data. Values below are placeholders."}
                </p>
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-medium text-zinc-700">Spend &amp; reach</h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs font-medium text-zinc-500">Spend</p>
                      <p className="text-lg font-semibold text-zinc-900">${metrics.spend.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs font-medium text-zinc-500">Impressions</p>
                      <p className="text-lg font-semibold text-zinc-900">{metrics.impressions.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs font-medium text-zinc-500">Reach</p>
                      <p className="text-lg font-semibold text-zinc-900">{metrics.reach.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs font-medium text-zinc-500">Frequency</p>
                      <p className="text-lg font-semibold text-zinc-900">{metrics.frequency.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs font-medium text-zinc-500">CPM</p>
                      <p className="text-lg font-semibold text-zinc-900">${metrics.cpm.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-medium text-zinc-700">Clicks &amp; engagement</h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs font-medium text-zinc-500">Clicks</p>
                      <p className="text-lg font-semibold text-zinc-900">{metrics.clicks.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs font-medium text-zinc-500">Link clicks</p>
                      <p className="text-lg font-semibold text-zinc-900">{metrics.linkClicks.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs font-medium text-zinc-500">CTR</p>
                      <p className="text-lg font-semibold text-zinc-900">{metrics.ctr.toFixed(2)}%</p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs font-medium text-zinc-500">CPC</p>
                      <p className="text-lg font-semibold text-zinc-900">${metrics.cpc.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs font-medium text-zinc-500">Conversions</p>
                      <p className="text-lg font-semibold text-zinc-900">{metrics.conversions.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3">
                      <p className="text-xs font-medium text-zinc-500">Cost per conversion</p>
                      <p className="text-lg font-semibold text-zinc-900">${metrics.costPerConversion.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-500">Metrics unavailable.</p>
            )}
          </section>

          {/* Campaign controls: pause/activate and budget when linked to Meta */}
          <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">Campaign controls</h2>
            {experiment.metaCampaignId || experiment.metaAdSetId ? (
              <>
                <p className="mb-4 text-sm text-zinc-600">Make changes here; they apply on Meta immediately.</p>
                {experiment.metaCampaignId && (
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-zinc-700">Status on Meta</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus("PAUSED")}
                      disabled={statusUpdating}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                    >
                      {statusUpdating ? "Updating…" : "Pause campaign"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus("ACTIVE")}
                      disabled={statusUpdating}
                      className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-100 disabled:opacity-50"
                    >
                      {statusUpdating ? "Updating…" : "Activate campaign"}
                    </button>
                    {statusError && <p className="text-sm text-red-600">{statusError}</p>}
                  </div>
                )}
                {experiment.metaAdSetId && (
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-sm font-medium text-zinc-700">
                      Daily budget (Meta): $
                      <input
                        type="number"
                        min={1}
                        step={1}
                        className="ml-1 w-20 rounded border border-zinc-300 px-2 py-1 text-zinc-900"
                        value={budgetValue}
                        onChange={(e) => setBudgetValue(e.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleUpdateBudget}
                      disabled={budgetUpdating}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {budgetUpdating ? "Saving…" : "Update budget"}
                    </button>
                    {budgetError && <p className="text-sm text-red-600">{budgetError}</p>}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-zinc-500">Link this campaign to Meta (launch to Meta) to pause, activate, or change budget from here.</p>
            )}
          </section>
        </>
      )}

      {experiment.prompt && (
        <div className="mt-6 rounded-lg bg-zinc-100 p-4">
          <p className="text-sm font-medium text-zinc-700">Ad idea / prompt</p>
          <p className="text-zinc-600 text-sm mt-1">{experiment.prompt}</p>
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-2 text-lg font-semibold text-zinc-900">Ad variants</h2>
        <p className="mb-4 text-sm text-zinc-600">
          {experiment.creativesSource === "own"
            ? "Paste your ad copy for each variant and click Save. When ready, click Launch campaign."
            : "Review and edit copy below. Use “Regenerate with AI” for new copy or “Regenerate creative” to change the image. When ready, click Launch campaign."}
        </p>

        {variants.length === 0 ? (
          <p className="text-zinc-500">No variants yet. Create this campaign again from the new campaign flow.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {variants.map((v) => (
              <div
                key={v.id}
                className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-zinc-800">
                    Variant {v.index}
                    {isAdmin && v.aiSource && (
                      <span
                        className="ml-2 rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600"
                        title="Which AI generated this variant"
                      >
                        {v.aiSource === "openai" ? "OpenAI" : "Anthropic"}
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {savedVariantId === v.id && (
                      <span className="text-xs text-green-600">Saved</span>
                    )}
                    {experiment.creativesSource === "ai" && (
                      <button
                        type="button"
                        onClick={() => regenerateVariant(v)}
                        disabled={regeneratingVariantId === v.id}
                        className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 hover:bg-blue-200 disabled:opacity-50"
                      >
                        {regeneratingVariantId === v.id ? "…" : "Regenerate"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => saveVariant(v)}
                      disabled={savingVariantId === v.id || (variantCopies[v.id] ?? v.copy) === v.copy}
                      className="rounded bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-300 disabled:opacity-50"
                    >
                      {savingVariantId === v.id ? "…" : "Save"}
                    </button>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-xs font-medium text-zinc-500">Ad preview</p>
                    {(v.hasCreative || creativeUrls[v.id]) && (
                      <button
                        type="button"
                        onClick={() => generateCreative(v)}
                        disabled={generatingCreativeId === v.id}
                        className="rounded bg-violet-100 px-2 py-1 text-xs font-medium text-violet-800 hover:bg-violet-200 disabled:opacity-50"
                      >
                        {generatingCreativeId === v.id ? "Regenerating…" : "Regenerate creative"}
                      </button>
                    )}
                  </div>
                  <AdPreview
                    copy={variantCopies[v.id] ?? v.copy}
                    platform={experiment.platform}
                    imageUrl={creativeUrls[v.id] ?? null}
                  />
                </div>
                <textarea
                  className="min-h-[80px] w-full resize-y rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={variantCopies[v.id] ?? v.copy}
                  onChange={(e) =>
                    setVariantCopies((prev) => ({ ...prev, [v.id]: e.target.value }))
                  }
                  placeholder={experiment.creativesSource === "own" ? "Paste your ad copy here..." : "Ad copy..."}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
