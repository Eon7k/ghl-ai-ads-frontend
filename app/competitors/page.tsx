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
  const [resolvingFb, setResolvingFb] = useState(false);
  const [fbResolveMsg, setFbResolveMsg] = useState<string | null>(null);
  const [discoveringFromWeb, setDiscoveringFromWeb] = useState(false);
  const [fbWebCandidates, setFbWebCandidates] = useState<
    { pageId: string; pageUrl: string; source: "ad_library" | "direct" | "graph" }[] | null
  >(null);
  const [adLibIdForResolve, setAdLibIdForResolve] = useState("");
  const [resolvingAdLib, setResolvingAdLib] = useState(false);

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

  async function discoverPageFromCompetitorWebsite() {
    const w = website.trim();
    if (!w) {
      setError("Add a website URL first — we scan that page for Facebook links.");
      return;
    }
    setDiscoveringFromWeb(true);
    setError(null);
    setFbResolveMsg(null);
    setFbWebCandidates(null);
    try {
      const r = await expansion.competitor.discoverFacebookPageFromWebsite(w, {
        companyName: competitorName.trim() || undefined,
      });
      if (r.candidates.length === 0) {
        setError(r.message ?? "No Facebook Page id could be derived from the website.");
        if (r.foundLinks.length > 0) {
          setFbResolveMsg(
            `Found link(s) but could not resolve. Try “Look up Page id” on: ${r.foundLinks[0]!.slice(0, 100)}…`
          );
        }
        return;
      }
      setFacebookPageId(r.candidates[0]!.pageId);
      setFbWebCandidates(r.candidates);
      const scan = r.crawledPageCount > 0 ? `Scanned ${r.crawledPageCount} page(s). ` : "";
      let msg =
        r.candidates.length > 1
          ? `${scan}Found ${r.candidates.length} Pages in HTML — first selected; use the list to switch.`
          : `${scan}Page id: ${r.candidates[0]!.pageId}.`;
      if (r.googlePlace?.googleMapsUri) msg += ` Maps: ${r.googlePlace.googleMapsUri}`;
      setFbResolveMsg(msg);
    } catch (err) {
      setError(userFacingError(err));
    } finally {
      setDiscoveringFromWeb(false);
    }
  }

  async function resolvePageFromAdLibraryId() {
    const raw = adLibIdForResolve.trim();
    if (!raw) {
      setError("Paste one numeric Meta Ad Library ad id.");
      return;
    }
    setResolvingAdLib(true);
    setError(null);
    setFbResolveMsg(null);
    try {
      const r = await expansion.competitor.resolvePageFromAdLibraryId(raw);
      setFacebookPageId(r.pageId);
      setAdLibIdForResolve(r.adLibraryId);
      setFbWebCandidates(null);
      setFbResolveMsg(
        r.resolvedVia === "page_id"
          ? `That number is a Facebook Page id, not a single Library ad id. Using Page ${r.pageId}${r.pageName ? ` (${r.pageName})` : ""} — save, then you can add a watch. For a true ad id, use the id from a scan or ads_archive.`
          : `Page id ${r.pageId}${r.pageName ? ` (${r.pageName})` : ""} from ad id.`
      );
    } catch (err) {
      setError(userFacingError(err));
    } finally {
      setResolvingAdLib(false);
    }
  }

  async function resolveFacebookPageId() {
    const raw = facebookPageId.trim();
    if (!raw) {
      setFbResolveMsg(null);
      setError("Paste a Facebook Page URL, Meta Ad Library “View all” link, @handle, or id first.");
      return;
    }
    setResolvingFb(true);
    setError(null);
    setFbResolveMsg(null);
    try {
      const r = await expansion.competitor.resolveFacebookPage(raw);
      if (!r.pageId) {
        setError(r.message ?? "Could not resolve a Facebook Page id.");
        return;
      }
      setFacebookPageId(r.pageId);
      const how =
        r.source === "ad_library"
          ? "from the Ad Library URL"
          : r.source === "graph"
            ? "via Meta lookup"
            : "numeric id";
      setFbResolveMsg(`Page id ${r.pageId} (${how}).`);
    } catch (err) {
      setError(userFacingError(err));
    } finally {
      setResolvingFb(false);
    }
  }

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
        <p className="mt-2 text-sm text-zinc-700">
          Prefer to explore by topic instead of naming one competitor first?{" "}
          <Link href="/competitors/harvest" className="font-medium text-violet-700 underline hover:text-violet-800">
            Open ad library research
          </Link>
          {" "}
          to collect ads by keyword, review advertisers that appeared, and save market or brand summaries.
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          Each scan summarizes what we can see from the competitor&apos;s public website (headlines and messaging), optionally pulls recent
          public Meta ads when you connect their Page, and drafts an actionable brief when automation is enabled for your workspace.
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
              Optional: connect their <strong>Facebook Page</strong> if you want public Meta ads in the brief. Visit{" "}
              <a className="font-medium text-violet-800 underline" href="https://www.facebook.com/ads/library/" target="_blank" rel="noreferrer">
                Meta&apos;s Ad Library
              </a>
              , open any ad from that brand, then use <strong>See ad details</strong> or <strong>View all ads</strong>. Copy the Page URL
              from your browser (or anything on that screen), paste it into the Page field below, and tap{" "}
              <strong>Look up Page id</strong>—we&apos;ll fill in the correct reference for you.
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
              onChange={(e) => {
                setWebsite(e.target.value);
                setFbWebCandidates(null);
              }}
              placeholder="https://…"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Facebook Page (optional)</label>
            <textarea
              value={facebookPageId}
              onChange={(e) => {
                setFacebookPageId(e.target.value);
                setFbResolveMsg(null);
              }}
              rows={2}
              autoComplete="off"
              placeholder="Ad Library “View all” URL, or https://www.facebook.com/TheirPage, or @handle"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void discoverPageFromCompetitorWebsite()}
                disabled={discoveringFromWeb}
                className="rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-1.5 text-sm font-medium text-emerald-950 hover:bg-emerald-100 disabled:opacity-50"
                title="Loads the site you entered above and looks for a Facebook link in the page HTML."
              >
                {discoveringFromWeb ? "Scanning site…" : "Find Page id from website"}
              </button>
              <button
                type="button"
                onClick={() => void resolveFacebookPageId()}
                disabled={resolvingFb}
                className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-900 hover:bg-violet-100 disabled:opacity-50"
              >
                {resolvingFb ? "Looking up…" : "Look up Page id (paste text)"}
              </button>
              {fbResolveMsg && <span className="text-sm text-emerald-800">{fbResolveMsg}</span>}
            </div>
            {fbWebCandidates && fbWebCandidates.length > 1 && (
              <div className="mt-2 max-w-lg">
                <label className="block text-xs font-medium text-zinc-600" htmlFor="new-watch-fb-candidate">
                  Multiple Facebook links found — pick the Page to track:
                </label>
                <select
                  id="new-watch-fb-candidate"
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                  value={facebookPageId}
                  onChange={(e) => setFacebookPageId(e.target.value)}
                >
                  {fbWebCandidates.map((c) => (
                    <option key={c.pageId} value={c.pageId}>
                      {c.pageId} — {c.pageUrl.replace(/^https?:\/\//, "").slice(0, 80)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2">
              <p className="text-xs font-medium text-zinc-700">Or: one Ad Library ad id → Page id</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={adLibIdForResolve}
                  onChange={(e) => setAdLibIdForResolve(e.target.value)}
                  placeholder="Ad id (from ads_archive or library)"
                  className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void resolvePageFromAdLibraryId()}
                  disabled={resolvingAdLib}
                  className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {resolvingAdLib ? "Resolving…" : "Get Page from ad id"}
                </button>
              </div>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              <strong>First try:</strong> add <strong>Website</strong> and use <strong>Find Page id from website
              </strong> — no Ad Library, no manual search, when their footer links a Page. If that returns nothing, paste
              a Page or Ad Library URL and use <strong>Look up Page id (paste text)</strong>, or a single <strong>ad id</strong> as above.
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
