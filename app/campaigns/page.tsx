"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Experiment } from "@/lib/types";

export default function CampaignsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [campaigns, setCampaigns] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Form state for new campaign
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("meta");
  const [budget, setBudget] = useState("30");
  const [prompt, setPrompt] = useState("");
  const [variantCount, setVariantCount] = useState(10);
  const [creativesSource, setCreativesSource] = useState<"ai" | "own">("ai");
  const [aiCreativePercent, setAiCreativePercent] = useState(0);
  const [createLoading, setCreateLoading] = useState(false);
  const [createStatus, setCreateStatus] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const data = await api.listExperiments();
        setCampaigns(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load campaigns");
      } finally {
        setLoading(false);
      }
    }
    fetchCampaigns();
  }, []);

  // Open create panel when coming from /campaigns/new or ?open=create
  useEffect(() => {
    if (searchParams.get("open") === "create") setCreateOpen(true);
  }, [searchParams]);

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

    try {
      const experiment = await api.createExperiment({
        name,
        platform,
        totalDailyBudget,
        prompt: prompt.trim() || "Generate varied ad copy for this campaign.",
        variantCount: count,
        creativesSource,
      });

      const variants = experiment.variants || [];
      const creativeCount = Math.min(
        Math.round((variants.length * aiCreativePercent) / 100),
        variants.length
      );

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
    setPlatform("meta");
    setBudget("30");
    setPrompt("");
    setVariantCount(10);
    setCreativesSource("ai");
    setAiCreativePercent(0);
    setCreateError(null);
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-3xl p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Campaigns</h1>
          <p className="mt-1 text-zinc-600">
            Create campaigns, generate or paste ad copy, then launch to your connected ad accounts.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Create new campaign — dropdown trigger */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => {
              setCreateOpen((o) => !o);
              if (!createOpen) resetCreateForm();
            }}
            className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-zinc-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <span className="font-semibold text-zinc-900">Create new campaign</span>
            <svg
              className={`h-5 w-5 text-zinc-500 transition-transform ${createOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown panel with form */}
          {createOpen && (
            <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200 border-t-0 rounded-t-none bg-white shadow-sm">
              <div className="border-b border-zinc-100 bg-zinc-50/50 px-5 py-3">
                <h2 className="text-lg font-semibold text-zinc-900">New campaign</h2>
                <p className="mt-0.5 text-sm text-zinc-500">
                  Enter your idea below. We’ll generate ad variants for you to edit before launching.
                </p>
              </div>
              <form onSubmit={handleCreateSubmit} className="p-5 space-y-5">
                {createError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {createError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-zinc-700">Campaign name</label>
                  <input
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dental Implant Offer Test"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-zinc-700">Platform</label>
                  <select
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                  >
                    <option value="meta">Meta (Facebook/Instagram)</option>
                    <option value="google">Google Ads</option>
                    <option value="tiktok">TikTok Ads</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-zinc-700">Creatives</label>
                  <div className="flex gap-4">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="creativesSource"
                        checked={creativesSource === "ai"}
                        onChange={() => setCreativesSource("ai")}
                        className="rounded"
                      />
                      <span className="text-sm">AI-generated (from prompt below)</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="creativesSource"
                        checked={creativesSource === "own"}
                        onChange={() => setCreativesSource("own")}
                        className="rounded"
                      />
                      <span className="text-sm">I’ll use my own (paste per variant)</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-zinc-700">Ad idea / prompt</label>
                  <textarea
                    className="min-h-[100px] w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. Pain-free dental implants, same-day results, financing available."
                    required={creativesSource === "ai"}
                  />
                  <p className="text-xs text-zinc-500">
                    {creativesSource === "ai"
                      ? "We’ll generate full ad copies from this — you can edit or regenerate any variant."
                      : "Optional; you’ll paste your own copy per variant."}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-zinc-700">How many ad variants?</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
                    value={variantCount}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isNaN(n)) setVariantCount(Math.min(20, Math.max(1, n)));
                    }}
                  />
                  <p className="text-xs text-zinc-500">Between 1 and 20.</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-700">
                    AI creatives (images) for % of variants: <span className="font-semibold text-zinc-900">{aiCreativePercent}%</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={aiCreativePercent}
                    onChange={(e) => setAiCreativePercent(Number(e.target.value))}
                    className="h-2 w-full accent-violet-600"
                  />
                  <p className="text-xs text-zinc-500">
                    {aiCreativePercent === 0
                      ? "No AI-generated images."
                      : `${Math.round((variantCount * aiCreativePercent) / 100)} of ${variantCount} variants will get an AI image.`}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-700">
                    Total daily budget: <span className="font-semibold text-zinc-900">${budget}</span>
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={500}
                    step={5}
                    className="h-2 w-full accent-blue-600"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                  <p className="text-xs text-zinc-500">$5–$500/day, split across all variants.</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {createLoading ? createStatus || "Creating…" : "Create campaign"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateOpen(false)}
                    disabled={createLoading}
                    className="rounded-lg border border-zinc-300 bg-white px-5 py-2.5 font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Campaign list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <p className="text-zinc-600">No campaigns yet.</p>
            <p className="mt-1 text-sm text-zinc-500">Click “Create new campaign” above to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((c) => (
              <Link
                key={c.id}
                href={`/campaigns/${c.id}`}
                className="block overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:border-zinc-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <div className="flex items-start justify-between gap-4 border-b border-zinc-100 bg-zinc-50/50 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-zinc-900">{c.name}</h2>
                    <p className="mt-0.5 text-sm text-zinc-500">
                      {c.platform.charAt(0).toUpperCase() + c.platform.slice(1)} · ${c.totalDailyBudget}/day
                      {c.variantCount != null && c.variantCount > 0 && ` · ${c.variantCount} variant${c.variantCount === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      c.status === "draft" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
                    }`}
                  >
                    {c.status === "draft" ? "Draft" : "Launched"}
                  </span>
                </div>
                <div className="px-5 py-3 text-sm text-zinc-600">
                  {c.phase}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
