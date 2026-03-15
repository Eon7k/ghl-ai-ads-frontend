"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
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
  const [regeneratingVariantId, setRegeneratingVariantId] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

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

  async function saveVariant(v: AdVariant) {
    const copy = variantCopies[v.id] ?? v.copy;
    if (copy === v.copy) return;
    setSavingVariantId(v.id);
    try {
      await api.updateVariant(experiment!.id, v.id, copy);
      setExperiment((prev) => {
        if (!prev?.variants) return prev;
        return {
          ...prev,
          variants: prev.variants!.map((x) => (x.id === v.id ? { ...x, copy } : x)),
        };
      });
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

  async function launch() {
    if (!experiment || experiment.status === "launched") return;
    setLaunching(true);
    setLaunchError(null);
    try {
      const updated = await api.launchExperiment(experiment.id);
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
  const budgetPerVariant =
    variants.length > 0
      ? Math.round((experiment.totalDailyBudget / variants.length) * 100) / 100
      : null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link href="/experiments" className="text-blue-600 hover:underline text-sm block mb-2">
        ← Back to Experiments
      </Link>

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
            <>
              <button
                type="button"
                onClick={launch}
                disabled={launching || variants.length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {launching ? "Launching..." : "Launch experiment"}
              </button>
              {launchError && (
                <p className="text-red-600 text-sm w-full basis-full">{launchError}</p>
              )}
            </>
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
        <h2 className="text-lg font-semibold mb-3">Ad variants — review and launch</h2>
        <p className="text-zinc-600 text-sm mb-4">
          {experiment.creativesSource === "own"
            ? "Paste your ad copy for each variant below and click Save. When everything looks good, click “Launch experiment” above."
            : "Review the ad copies below. Edit any text yourself, or click “Regenerate with AI” to get a new option for that slot. Click Save to keep your changes, then “Launch experiment” when ready."}
        </p>

        {variants.length === 0 ? (
          <p className="text-zinc-500">No variants yet. Create this experiment again from the new experiment flow.</p>
        ) : (
          <ul className="space-y-4">
            {variants.map((v) => (
              <li key={v.id} className="border border-zinc-200 rounded-lg p-4 bg-white">
                <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                  <span className="font-medium text-zinc-800">Variant {v.index}</span>
                  <div className="flex gap-2">
                    {experiment.creativesSource === "ai" && (
                      <button
                        type="button"
                        onClick={() => regenerateVariant(v)}
                        disabled={regeneratingVariantId === v.id}
                        className="text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 px-3 py-1 rounded disabled:opacity-50"
                      >
                        {regeneratingVariantId === v.id ? "Generating..." : "Regenerate with AI"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => saveVariant(v)}
                      disabled={savingVariantId === v.id || (variantCopies[v.id] ?? v.copy) === v.copy}
                      className="text-sm bg-zinc-200 hover:bg-zinc-300 text-zinc-800 px-3 py-1 rounded disabled:opacity-50"
                    >
                      {savingVariantId === v.id ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
                <textarea
                  className="border border-zinc-300 rounded px-3 py-2 w-full min-h-[120px] text-sm"
                  value={variantCopies[v.id] ?? v.copy}
                  onChange={(e) =>
                    setVariantCopies((prev) => ({ ...prev, [v.id]: e.target.value }))
                  }
                  placeholder={experiment.creativesSource === "own" ? "Paste your ad copy here..." : "Ad copy..."}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
