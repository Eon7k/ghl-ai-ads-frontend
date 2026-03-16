"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import AdPreview from "@/components/AdPreview";
import type { Experiment, AdVariant } from "@/lib/types";

export default function ExperimentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Local copy of variant text so we can edit before saving
  const [variantCopies, setVariantCopies] = useState<Record<string, string>>({});
  const [savingVariantId, setSavingVariantId] = useState<string | null>(null);
  const [savedVariantId, setSavedVariantId] = useState<string | null>(null);
  const [regeneratingVariantId, setRegeneratingVariantId] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [aiCreativePercent, setAiCreativePercent] = useState(0);
  const [creativeUrls, setCreativeUrls] = useState<Record<string, string>>({});
  const [generatingCreativeId, setGeneratingCreativeId] = useState<string | null>(null);
  const [generatingBulkCreatives, setGeneratingBulkCreatives] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

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
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load experiment");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  // Load creative blob URLs for variants that have hasCreative
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

  // Revoke all creative URLs on unmount
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

  async function generateBulkCreatives() {
    if (!experiment?.variants?.length) return;
    const targetCount = Math.round((variants.length * aiCreativePercent) / 100);
    if (targetCount <= 0) return;
    const withCreative = variants.filter((v) => v.hasCreative || creativeUrls[v.id]).length;
    const needCount = Math.max(0, targetCount - withCreative);
    if (needCount === 0) return;
    const withoutCreative = variants.filter((v) => !v.hasCreative && !creativeUrls[v.id]);
    const toGenerate = withoutCreative.slice(0, needCount);
    if (toGenerate.length === 0) return;
    setGeneratingBulkCreatives(true);
    setBulkProgress({ current: 0, total: toGenerate.length });
    try {
      for (let i = 0; i < toGenerate.length; i++) {
        setBulkProgress({ current: i + 1, total: toGenerate.length });
        const v = toGenerate[i];
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
        } catch {
          // continue with next
        }
      }
    } finally {
      setGeneratingBulkCreatives(false);
      setBulkProgress({ current: 0, total: 0 });
    }
  }

  async function launch() {
    if (!experiment || experiment.status === "launched") return;
    setLaunching(true);
    setLaunchError(null);
    const count = Math.round((variants.length * aiCreativePercent) / 100);
    try {
      const updated = await api.launchExperiment(experiment.id, { aiCreativeCount: count });
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
        <p className="text-zinc-600">Loading experiment...</p>
      </div>
    );
  }

  if (error || !experiment) {
    return (
      <div className="p-6">
        <Link href="/experiments" className="text-blue-600 hover:underline text-sm block mb-2">
          ← Back to Experiments
        </Link>
        <p className="text-red-600">{error || "Experiment not found."}</p>
      </div>
    );
  }

  const variants = experiment.variants || [];
  const isDraft = experiment.status === "draft";
  const targetCreativeCount = Math.round((variants.length * aiCreativePercent) / 100);
  const budgetPerVariant =
    variants.length > 0
      ? Math.round((experiment.totalDailyBudget / variants.length) * 100) / 100
      : null;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4">
        <Link href="/experiments" className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline">
          ← Back to Experiments
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
            <div className="flex flex-wrap items-end gap-4">
              {variants.length > 0 && (
                <div className="flex flex-col gap-2">
                  <label htmlFor="ai-creatives-pct" className="text-sm font-medium text-zinc-700">
                    % of variants with AI creative
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="ai-creatives-pct"
                      type="range"
                      min={0}
                      max={100}
                      value={aiCreativePercent}
                      onChange={(e) => setAiCreativePercent(Number(e.target.value))}
                      className="h-2 w-28 rounded-lg accent-blue-600"
                    />
                    <span className="text-sm font-semibold tabular-nums text-zinc-900">{aiCreativePercent}%</span>
                    <span className="text-sm text-zinc-500">
                      ({targetCreativeCount} of {variants.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={generateBulkCreatives}
                    disabled={generatingBulkCreatives || targetCreativeCount === 0}
                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    {generatingBulkCreatives
                      ? `Generating ${bulkProgress.current} of ${bulkProgress.total}…`
                      : `Generate AI creatives for ${targetCreativeCount} variant${targetCreativeCount === 1 ? "" : "s"}`}
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={launch}
                disabled={launching || variants.length === 0}
                className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {launching ? "Launching…" : "Launch experiment"}
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

      {experiment.prompt && (
        <div className="rounded-lg bg-zinc-100 p-4">
          <p className="text-sm font-medium text-zinc-700">Ad idea / prompt</p>
          <p className="text-zinc-600 text-sm mt-1">{experiment.prompt}</p>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-lg font-semibold text-zinc-900">Ad variants</h2>
        <p className="mb-4 text-sm text-zinc-600">
          {experiment.creativesSource === "own"
            ? "Paste your ad copy for each variant and click Save. Above, choose how many get AI creatives at launch, then Launch."
            : "Review and edit copy below. Use “Regenerate with AI” per variant if needed. Above, set how many variants get AI creatives at launch, then Launch."}
        </p>

        {variants.length === 0 ? (
          <p className="text-zinc-500">No variants yet. Create this experiment again from the new experiment flow.</p>
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
