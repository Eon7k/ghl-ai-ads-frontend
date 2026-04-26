"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppNav from "@/components/AppNav";
import { ExpansionProductGate } from "@/components/ExpansionProductGate";
import { useAuth } from "@/contexts/AuthContext";
import { expansion, type CompetitorWatchRow } from "@/lib/api";

function CompetitorsPageInner() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [watches, setWatches] = useState<CompetitorWatchRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const [competitorName, setCompetitorName] = useState("");
  const [website, setWebsite] = useState("");
  const [keywords, setKeywords] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setListLoading(true);
    setError(null);
    try {
      const { watches: rows } = await expansion.competitor.listWatches();
      setWatches(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load watches");
      setWatches([]);
    } finally {
      setListLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) void load();
  }, [user, load, refetchKey]);

  useEffect(() => {
    const refresh = () => setRefetchKey((k) => k + 1);
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  async function createWatch(e: React.FormEvent) {
    e.preventDefault();
    const name = competitorName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const kw = keywords
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const { watch } = await expansion.competitor.createWatch({
        competitorName: name,
        competitorWebsite: website.trim() || null,
        keywords: kw,
        platforms: ["meta", "google"],
      });
      setCompetitorName("");
      setWebsite("");
      setKeywords("");
      router.push(`/competitors/${watch.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
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
        <h1 className="mt-4 text-2xl font-bold text-zinc-900">Competitor watches</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Track brands and keywords per client. <strong>Run scan</strong> saves a snapshot insight; live Meta/Google Ad
          Library pulls can replace the placeholder later.
        </p>

        <form
          onSubmit={createWatch}
          className="mt-8 space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-zinc-900">New watch</h2>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Competitor name</label>
            <input
              value={competitorName}
              onChange={(e) => setCompetitorName(e.target.value)}
              placeholder="Rival Cryo Co."
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Website (optional)</label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://…"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Keywords (comma or newline)</label>
            <textarea
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              rows={2}
              placeholder="cryotherapy, local ads, summer promo"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create & open"}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-900">Your watches</h2>
          {listLoading && <p className="mt-3 text-sm text-zinc-500">Loading…</p>}
          {!listLoading && watches.length === 0 && (
            <p className="mt-3 text-sm text-zinc-600">No watches yet. Add one above.</p>
          )}
          <ul className="mt-4 space-y-2">
            {watches.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/competitors/${w.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900">{w.competitorName}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {w.lastScannedAt
                        ? `Last scan ${new Date(w.lastScannedAt).toLocaleString()}`
                        : "Not scanned yet"}
                      {w._count != null
                        ? ` · ${w._count.insights} insights · ${w._count.ads} ads`
                        : ""}
                      {w.isActive ? "" : " · paused"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-violet-700">Open →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

export default function CompetitorsPage() {
  return (
    <ExpansionProductGate productKey="competitors">
      <CompetitorsPageInner />
    </ExpansionProductGate>
  );
}
