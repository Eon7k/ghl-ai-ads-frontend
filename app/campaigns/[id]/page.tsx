"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import AdPreview from "@/components/AdPreview";
import type { Experiment, AdVariant } from "@/lib/types";

import type { CampaignMetricsResponse } from "@/lib/api";

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
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
          copies[v.id] = v.copy;
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
          variants: prev.variants!.map((x) => (x.id === v.id ? { ...x, copy } : x)),
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

  async function launch() {
    if (!experiment || experiment.status === "launched") return;
    setLaunching(true);
    setLaunchError(null);
    const countWithCreatives = variants.filter((v) => v.hasCreative || creativeUrls[v.id]).length;
    try {
      const updated = await api.launchExperiment(experiment.id, { aiCreativeCount: countWithCreatives });
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
        <Link href="/campaigns" className="text-blue-600 hover:underline text-sm block mb-2">
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
        <Link href="/campaigns" className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline">
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
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={launch}
                disabled={launching || variants.length === 0}
                className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {launching ? "Launching…" : "Launch campaign"}
              </button>
              {launchError && (
                <p className="w-full basis-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {launchError}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Campaign metrics: shown when launched */}
      {experiment.status === "launched" && (
        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">Campaign performance</h2>
          {metricsLoading ? (
            <p className="text-sm text-zinc-500">Loading metrics…</p>
          ) : metrics ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-xs font-medium text-zinc-500">Spend</p>
                  <p className="text-lg font-semibold text-zinc-900">${metrics.spend.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-xs font-medium text-zinc-500">Impressions</p>
                  <p className="text-lg font-semibold text-zinc-900">{metrics.impressions.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-xs font-medium text-zinc-500">Clicks</p>
                  <p className="text-lg font-semibold text-zinc-900">{metrics.clicks.toLocaleString()}</p>
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
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                {metrics.source === "meta"
                  ? "Metrics from Meta (last 7 days)."
                  : "Live metrics will appear here once this campaign is pushed to your connected ad account (e.g. Meta). Connect an integration and launch to the platform to see real data."}
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-500">Metrics unavailable.</p>
          )}
        </section>
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
                  <span className="font-medium text-zinc-800">Variant {v.index}</span>
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
