"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppNav from "@/components/AppNav";
import { ExpansionProductGate } from "@/components/ExpansionProductGate";
import { useAuth } from "@/contexts/AuthContext";
import { expansion, type CompetitorWatchRow } from "@/lib/api";
import { userFacingError } from "@/lib/userFacingError";
import { CompetitorWatchGuide } from "@/components/CompetitorWatchGuide";

function ListSkeleton() {
  return (
    <ul className="mt-4 space-y-2" aria-hidden>
      {[1, 2, 3].map((i) => (
        <li key={i} className="h-16 animate-pulse rounded-lg bg-zinc-200/80" />
      ))}
    </ul>
  );
}

function CompetitorsPageInner() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [watches, setWatches] = useState<CompetitorWatchRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const [competitorName, setCompetitorName] = useState("");
  const [website, setWebsite] = useState("");
  const [facebookPageId, setFacebookPageId] = useState("");
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
      setError(userFacingError(e));
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
      const fbRaw = facebookPageId.trim();
      const { watch } = await expansion.competitor.createWatch({
        competitorName: name,
        competitorWebsite: website.trim() || null,
        competitorFacebookPageId: fbRaw || null,
        keywords: kw,
        platforms: ["meta", "google"],
      });
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(
            `ghl-cw-prefill-${watch.id}`,
            JSON.stringify({
              website: website.trim() || undefined,
              facebookRaw: fbRaw || undefined,
              keywords: kw.length ? kw.join(", ") : undefined,
            })
          );
        } catch {
          // ignore
        }
      }
      setCompetitorName("");
      setWebsite("");
      setFacebookPageId("");
      setKeywords("");
      router.push(`/competitors/${watch.id}`);
    } catch (err) {
      setError(userFacingError(err));
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
        <h1 className="mt-4 text-2xl font-bold text-zinc-900">Competitor watch</h1>
        <p className="mt-2 text-sm text-zinc-600">
          <strong>What you get on each run:</strong> a safe fetch of the competitor’s public site (title, key copy, your keyword
          presence), optional <strong>Meta Ad Library</strong> ads when you add their Page ID and the backend has Meta app
          credentials, and an <strong>AI brief</strong> (themes, counter-angles) when <code className="rounded bg-zinc-100 px-1">OPENAI_API_KEY</code> is
          set on the server. Re-run any time the market moves.
        </p>

        <CompetitorWatchGuide />

        <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/50 px-4 py-3 text-sm text-violet-950">
          <p className="font-medium">Before you run a scan</p>
          <ol className="mt-1 list-decimal space-y-1 pl-4 text-violet-900/90">
            <li>
              Add their <strong>website URL</strong> so we can read public landing copy (blocked links like localhost are
              rejected).
            </li>
            <li>
              Optional: <strong>Meta Page ID</strong> (numeric) to pull public ads. Find it: Page → &quot;About&quot; → Page
              transparency, or the URL <code className="rounded bg-white/80 px-1">facebook.com/profile.php?id=…</code>.
            </li>
            <li>
              <strong>Keywords</strong> you care about — we count how often they show up on the page.
            </li>
          </ol>
        </div>

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
              placeholder="Rival brand name"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Website (strongly recommended)</label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://…"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Facebook Page (optional)</label>
            <textarea
              value={facebookPageId}
              onChange={(e) => setFacebookPageId(e.target.value)}
              rows={2}
              autoComplete="off"
              placeholder="https://www.facebook.com/TheirPage  — or paste the numeric id"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Easiest: paste the competitor&apos;s <strong>Facebook Page</strong> address from the browser. We look up the Page id
              on the server. You can also use <code className="rounded bg-zinc-100 px-0.5">@PageUsername</code> or the digits only
              (from Page info) if you prefer.
            </p>
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

        {error && (
          <div
            className="mt-4 flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            role="alert"
          >
            <p className="text-sm text-red-800">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setRefetchKey((k) => k + 1);
              }}
              className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        )}

        <section className="mt-10" aria-label="Competitor watches list">
          <h2 className="text-lg font-semibold text-zinc-900">Your watches</h2>
          {listLoading && <ListSkeleton />}
          {!listLoading && watches.length === 0 && (
            <p className="mt-3 text-sm text-zinc-600">No watches yet. Add a competitor name above — you can add the URL and keywords on the next screen too.</p>
          )}
          {!listLoading && watches.length > 0 && (
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
                          ? ` · ${w._count.insights} insight${w._count.insights === 1 ? "" : "s"} · ${w._count.ads} ad${
                              w._count.ads === 1 ? "" : "s"
                            }`
                          : ""}
                        {w.isActive ? "" : " · paused"}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm text-violet-700">Open →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-8 text-sm text-zinc-500">
          Back to <Link href="/#integrations-bar" className="text-violet-700 hover:underline">ad connections</Link> or{" "}
          <Link href="/content-strategy" className="text-violet-700 hover:underline">content strategy</Link>.
        </p>
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
