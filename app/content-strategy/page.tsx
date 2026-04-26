"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

type Mode = "full" | "text_plus_prompts" | "ideas_only";
type Horizon = "single" | "week" | "month";

export default function ContentStrategyPage() {
  const { businessModelProfile, businessOnboardingComplete, loading, user, accountType, businessProfileForEmail } =
    useAuth();
  const subject = businessProfileForEmail || user?.email || "";
  const isClientContext = accountType === "agency" && user?.email && subject && subject !== user.email;
  const [userPrompt, setUserPrompt] = useState("");
  const [mode, setMode] = useState<Mode>("full");
  const [horizon, setHorizon] = useState<Horizon>("week");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);

  const profileSkipped = Boolean(
    businessModelProfile && (businessModelProfile as { skipped?: boolean }).skipped === true
  );
  const hasUsefulProfile = businessOnboardingComplete === true && !profileSkipped;

  async function generate() {
    setGenLoading(true);
    setError(null);
    setResult(null);
    try {
      const { markdown } = await api.contentStrategy.generate({
        userPrompt,
        mode,
        horizon,
      });
      setResult(markdown);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-zinc-600">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 pb-20">
      <h1 className="text-2xl font-bold text-zinc-900">Content strategy</h1>
      {isClientContext && (
        <p className="mt-2 rounded-md border border-violet-200 bg-violet-50/80 px-2 py-1.5 text-sm text-violet-950">
          Plans use the <strong>client</strong> profile and context for <span className="font-mono text-xs">{subject}</span>.{" "}
          Your agency login is separate — change who you act as on{" "}
          <Link className="font-medium text-violet-900 underline" href="/agency">Agency clients</Link>.
        </p>
      )}
      <p className="form-hint mt-2 max-w-2xl">
        Claude uses the saved business model for this scope (if any) plus the notes below. Set{" "}
        <Link className="text-blue-700 underline" href="/onboarding/business?edit=1">
          the business profile
        </Link>{" "}
        for better output.
      </p>

      {!hasUsefulProfile && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-950">
          {profileSkipped
            ? "You previously skipped the business profile. The AI can still work from the notes you add below — or "
            : "We do not have a full business profile. Add context below, or "}
          <Link className="font-medium text-amber-950 underline" href="/onboarding/business?edit=1">
            {profileSkipped ? "update your business profile" : "complete the questionnaire"}
          </Link>{" "}
          for more tailored output.
        </div>
      )}

      {hasUsefulProfile && businessModelProfile && (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 text-xs text-zinc-700">
          <p className="font-medium text-zinc-800">Profile on file (passed to Claude)</p>
          <p className="mt-1 font-mono text-[11px] whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
            {JSON.stringify(businessModelProfile, null, 2)}
          </p>
        </div>
      )}

      <div className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-zinc-800">Context or focus for this run</label>
          <textarea
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            rows={4}
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="e.g. Launch a new membership tier in March; emphasize trust and speed; we post on LinkedIn 3x per week…"
          />
        </div>

        <div>
          <p className="text-sm font-medium text-zinc-800">What should the AI produce?</p>
          <div className="mt-2 space-y-2">
            <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-800">
              <input type="radio" name="mode" checked={mode === "full"} onChange={() => setMode("full")} />
              <span>
                <span className="font-medium">Full content</span> — ready-to-post copy (and light creative notes) for each
                slot
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-800">
              <input
                type="radio"
                name="mode"
                checked={mode === "text_plus_prompts"}
                onChange={() => setMode("text_plus_prompts")}
              />
              <span>
                <span className="font-medium">Text + your checklist</span> — post text for each day/slot, plus what you
                need to create (photos, video, design)
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-800">
              <input type="radio" name="mode" checked={mode === "ideas_only"} onChange={() => setMode("ideas_only")} />
              <span>
                <span className="font-medium">Ideas only</span> — themes and hooks; you write everything
              </span>
            </label>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-zinc-800">Time horizon</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {(
              [
                { id: "single" as const, label: "One post" },
                { id: "week" as const, label: "One week" },
                { id: "month" as const, label: "About a month" },
              ] as const
            ).map((h) => (
              <label
                key={h.id}
                className="flex cursor-pointer items-center gap-2 rounded border border-zinc-200 bg-white px-3 py-2 text-sm"
              >
                <input
                  type="radio"
                  name="horizon"
                  checked={horizon === h.id}
                  onChange={() => setHorizon(h.id)}
                />
                {h.label}
              </label>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={genLoading}
          className="rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-50"
        >
          {genLoading ? "Generating with Claude…" : "Generate plan"}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      {result && (
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-800">Result (Markdown)</h2>
          <pre className="mt-3 max-h-[70vh] overflow-auto whitespace-pre-wrap break-words font-sans text-sm text-zinc-800">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}
