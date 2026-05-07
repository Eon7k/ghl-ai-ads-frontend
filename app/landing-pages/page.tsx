"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppNav from "@/components/AppNav";
import { ExpansionProductGate } from "@/components/ExpansionProductGate";
import { useAuth } from "@/contexts/AuthContext";
import { expansion, type LandingPageRecord } from "@/lib/api";
function LandingPagesListPageInner() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pages, setPages] = useState<LandingPageRecord[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const [aiTitle, setAiTitle] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGoal, setAiGoal] = useState("");
  const [competitorUrlsText, setCompetitorUrlsText] = useState("");
  const [scanBusy, setScanBusy] = useState(false);
  const [aiGenBusy, setAiGenBusy] = useState(false);
  const [builderInfo, setBuilderInfo] = useState<string | null>(null);
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [lastScanSummary, setLastScanSummary] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setListLoading(true);
    setListError(null);
    try {
      const { pages: rows } = await expansion.landingPages.list();
      setPages(rows);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Could not load landing pages");
      setPages([]);
    } finally {
      setListLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) void load();
  }, [user, load, refetchKey]);

  useEffect(() => {
    const refresh = () => setRefetchKey((k) => k + 1);
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  async function analyzeCompetitorsOnly() {
    setBuilderError(null);
    setBuilderInfo(null);
    setLastScanSummary(null);
    if (!competitorUrlsText.trim()) {
      setBuilderError("Paste at least one competitor URL to analyze.");
      return;
    }
    setScanBusy(true);
    try {
      const r = await expansion.landingPages.competitorScan({ urlsText: competitorUrlsText });
      if (r.error && !r.synthesis) {
        setBuilderError(r.error);
      } else if (r.error) {
        setBuilderInfo(r.error);
      }
      if (r.synthesis) {
        setLastScanSummary(r.synthesis);
        setBuilderInfo("Analysis ready — review below. Generate a page to fold these insights into copy.");
      } else if (!r.error) {
        setBuilderError("No synthesis returned — confirm the URLs are public and load in a browser, then try again.");
      }
      const failed = r.sites.filter((s) => !s.ok).length;
      if (failed > 0) {
        setBuilderInfo((prev) =>
          [prev, `${failed} URL(s) could not be fetched (blocked, timeout, or invalid).`].filter(Boolean).join(" ")
        );
      }
    } catch (e) {
      setBuilderError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanBusy(false);
    }
  }

  async function generateWithAi(e: React.FormEvent) {
    e.preventDefault();
    setBuilderError(null);
    setBuilderInfo(null);
    const t = aiTitle.trim();
    const p = aiPrompt.trim();
    if (!t || !p) {
      setBuilderError("Enter a page title and a creative brief for AI.");
      return;
    }
    setAiGenBusy(true);
    try {
      const { page } = await expansion.landingPages.aiCreate({
        title: t,
        prompt: p,
        conversionGoal: aiGoal.trim() || undefined,
        competitorUrlsText: competitorUrlsText.trim() || undefined,
      });
      setAiTitle("");
      setAiPrompt("");
      setAiGoal("");
      setCompetitorUrlsText("");
      setLastScanSummary(null);
      void load();
      router.push(`/landing-pages/${page.id}`);
    } catch (err) {
      setBuilderError(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setAiGenBusy(false);
    }
  }

  async function createPage(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    const t = title.trim();
    if (!t) {
      setCreateError("Enter a title");
      return;
    }
    setCreating(true);
    try {
      const { page } = await expansion.landingPages.create({
        title: t,
        status: "draft",
        pageData: {
          headline: t,
          subheadline: "",
          body: "",
          ctaText: "Get started",
          ctaUrl: "",
        },
      });
      setTitle("");
      router.push(`/landing-pages/${page.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppNav />
      <main id="main-content" className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/" className="text-sm text-violet-700 hover:underline">
          ← Home
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-zinc-900">Landing pages & website builder</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Draft copy with AI from a brief, optionally scrape reference sites for strengths and weaknesses first, then edit and publish. Or start blank.
          Agency accounts: use{" "}
          <Link href="/agency" className="text-violet-700 hover:underline">
            Select client
          </Link>{" "}
          so pages attach to the right account.
        </p>

        <section className="mt-8 rounded-2xl border border-violet-200 bg-violet-50/40 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">AI website builder</h2>
          <p className="mt-2 text-sm text-zinc-700">
            <strong>Prompt only</strong> — describe your offer, audience, and tone. <strong>With URLs</strong> — paste competitor or inspiration sites (one per line,
            or CSV with URLs in the first column); we fetch public HTML only and summarize what works or falls flat, then generate differentiated copy.
          </p>
          <form onSubmit={generateWithAi} className="mt-5 space-y-4">
            <div>
              <label htmlFor="ai-lp-title" className="block text-sm font-medium text-zinc-700">
                Page title
              </label>
              <input
                id="ai-lp-title"
                value={aiTitle}
                onChange={(e) => setAiTitle(e.target.value)}
                placeholder="March promo — IV hydration"
                className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-zinc-900"
              />
            </div>
            <div>
              <label htmlFor="ai-lp-prompt" className="block text-sm font-medium text-zinc-700">
                Creative brief (required)
              </label>
              <textarea
                id="ai-lp-prompt"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={5}
                placeholder="Who it's for, promise, proof, tone (e.g. clinical vs playful), objections to handle, legal disclaimers…"
                className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-zinc-900"
              />
            </div>
            <div>
              <label htmlFor="ai-lp-goal" className="block text-sm font-medium text-zinc-700">
                Conversion goal (optional)
              </label>
              <input
                id="ai-lp-goal"
                value={aiGoal}
                onChange={(e) => setAiGoal(e.target.value)}
                placeholder="Book consult, lead form, phone call…"
                className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-zinc-900"
              />
            </div>
            <div>
              <label htmlFor="ai-lp-urls" className="block text-sm font-medium text-zinc-700">
                Competitor / reference URLs (optional)
              </label>
              <textarea
                id="ai-lp-urls"
                value={competitorUrlsText}
                onChange={(e) => setCompetitorUrlsText(e.target.value)}
                rows={4}
                placeholder={"https://example.com/pricing\nhttps://rival.com/book"}
                className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 font-mono text-xs text-zinc-900"
              />
              <p className="mt-1 text-xs text-zinc-500">Max 12 URLs · public pages only · JS-heavy sites may snapshot incompletely.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={aiGenBusy}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {aiGenBusy ? "Generating…" : "Generate landing page"}
              </button>
              <button
                type="button"
                disabled={scanBusy || !competitorUrlsText.trim()}
                onClick={() => void analyzeCompetitorsOnly()}
                className="rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-medium text-violet-900 hover:bg-violet-50 disabled:opacity-50"
              >
                {scanBusy ? "Analyzing…" : "Analyze URLs only"}
              </button>
            </div>
          </form>
          {builderError && <p className="mt-3 text-sm text-red-700">{builderError}</p>}
          {builderInfo && !builderError && <p className="mt-3 text-sm text-violet-900">{builderInfo}</p>}
          {lastScanSummary && (
            <div className="mt-4 rounded-xl border border-violet-100 bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Research summary</p>
              <div className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap text-sm text-zinc-800">{lastScanSummary}</div>
            </div>
          )}
        </section>

        <h2 className="mt-10 text-lg font-semibold text-zinc-900">Manual start</h2>
        <p className="mt-1 text-sm text-zinc-600">Empty scaffold — fill fields yourself.</p>

        <form
          onSubmit={createPage}
          className="mt-8 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="new-lp-title" className="block text-sm font-medium text-zinc-700">
              New page title
            </label>
            <input
              id="new-lp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Spring promo — cryotherapy"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create & edit"}
          </button>
        </form>
        {createError && <p className="mt-2 text-sm text-red-600">{createError}</p>}

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-900">Your pages</h2>
          {listLoading && <p className="mt-3 text-sm text-zinc-500">Loading…</p>}
          {listError && <p className="mt-3 text-sm text-red-600">{listError}</p>}
          {!listLoading && !listError && pages.length === 0 && (
            <p className="mt-3 text-sm text-zinc-600">No landing pages yet. Create one above.</p>
          )}
          <ul className="mt-4 space-y-2">
            {pages.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/landing-pages/${p.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900">{p.title}</p>
                    <p className="truncate text-xs text-zinc-500">
                      /{p.slug} · {p.status}
                      {p.experiment ? ` · ${p.experiment.name}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-violet-700">Edit →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

export default function LandingPagesListPage() {
  return (
    <ExpansionProductGate productKey="landing_pages">
      <LandingPagesListPageInner />
    </ExpansionProductGate>
  );
}
