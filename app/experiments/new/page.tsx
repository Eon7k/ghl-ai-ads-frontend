"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

export default function NewExperimentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("meta");
  const [budget, setBudget] = useState("30");
  const [prompt, setPrompt] = useState("");
  const [variantCount, setVariantCount] = useState(10);
  const [creativesSource, setCreativesSource] = useState<"ai" | "own">("ai");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const totalDailyBudget = Number(budget);
    const count = Number(variantCount);

    if (count < 1 || count > 20) {
      setError("Number of ad variants must be between 1 and 20.");
      setLoading(false);
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

      // Go to the experiment detail page to review and edit variants
      router.push(`/experiments/${experiment.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create experiment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-4">
        <Link href="/experiments" className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline">
          ← Back to Experiments
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-zinc-900">New Experiment</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Enter your idea below. We’ll generate ad variants for you to edit before launching.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-700">Experiment name</label>
          <input
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dental Implant Offer Test"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">Platform</label>
          <select
            className="border border-zinc-300 rounded px-3 py-2 w-full"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            <option value="meta">Meta (Facebook/Instagram)</option>
            <option value="google">Google Ads</option>
            <option value="tiktok">TikTok Ads</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">Creatives</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="creativesSource"
                checked={creativesSource === "ai"}
                onChange={() => setCreativesSource("ai")}
                className="rounded"
              />
              <span className="text-sm">AI-generated (from prompt below)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
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
          <label className="block text-sm font-medium">Ad idea / prompt</label>
          <textarea
            className="border border-zinc-300 rounded px-3 py-2 w-full min-h-[100px]"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Pain-free dental implants, same-day results, financing available. Target people looking for affordable dental work."
            required={creativesSource === "ai"}
          />
          <p className="text-xs text-zinc-500">
            {creativesSource === "ai"
              ? "We’ll generate full ad copies from this — you review them and can edit or regenerate any variant."
              : "Optional: describe the campaign for your reference; you’ll paste your own copy per variant."}
          </p>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">How many ad variants?</label>
          <input
            type="number"
            min={1}
            max={20}
            className="border border-zinc-300 rounded px-3 py-2 w-full"
            value={variantCount}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isNaN(n)) setVariantCount(Math.min(20, Math.max(1, n)));
            }}
          />
          <p className="text-xs text-zinc-500">Between 1 and 20. AI will create this many full ad copies for you to review.</p>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">Total daily budget ($)</label>
          <input
            type="number"
            min={1}
            className="border border-zinc-300 rounded px-3 py-2 w-full"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            required
          />
          <p className="text-xs text-zinc-500">This will be split across all variants. You can change how it’s split later.</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading
            ? creativesSource === "ai"
              ? "Creating and generating variants..."
              : "Creating experiment..."
            : "Create experiment"}
        </button>
      </form>
    </div>
  );
}
