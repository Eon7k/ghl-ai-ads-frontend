"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AppNav from "@/components/AppNav";
import { ExpansionProductGate } from "@/components/ExpansionProductGate";
import {
  renderInsightSummaryText,
  stringArrayFromJson,
  strongestAdsFromJson,
  parseCompetitivePack,
  type YourCampaignIdea,
} from "@/components/competitorUtils";
import { useAuth } from "@/contexts/AuthContext";
import { expansion, type CompetitorWatchDetail } from "@/lib/api";
import { userFacingError } from "@/lib/userFacingError";

function keywordsToString(kw: unknown): string {
  if (!Array.isArray(kw)) return "";
  return kw.filter((x): x is string => typeof x === "string").join(", ");
}

function platformsToString(pl: unknown): string {
  if (!Array.isArray(pl)) return "";
  return pl.filter((x): x is string => typeof x === "string").join(", ");
}

function DetailSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="h-8 w-48 animate-pulse rounded bg-zinc-200" />
      <div className="h-40 animate-pulse rounded-xl bg-zinc-200" />
    </div>
  );
}

function CompetitorDetailInner() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { user, loading } = useAuth();

  const [watch, setWatch] = useState<CompetitorWatchDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastScanLog, setLastScanLog] = useState<string[] | null>(null);
  const [lastScanLogAdsCount, setLastScanLogAdsCount] = useState<number | null>(null);
  const [lastScanAt, setLastScanAt] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [resolvingFb, setResolvingFb] = useState(false);
  const [fbResolveMsg, setFbResolveMsg] = useState<string | null>(null);
  const [discoveringFromWeb, setDiscoveringFromWeb] = useState(false);
  const [fbWebCandidates, setFbWebCandidates] = useState<
    { pageId: string; pageUrl: string; source: "ad_library" | "direct" | "graph" }[] | null
  >(null);
  const [adLibIdForResolve, setAdLibIdForResolve] = useState("");
  const [resolvingAdLib, setResolvingAdLib] = useState(false);
  const [adLibKeywordSearch, setAdLibKeywordSearch] = useState("");
  const [discoveringKeywordPages, setDiscoveringKeywordPages] = useState(false);
  const [adLibKeywordCandidates, setAdLibKeywordCandidates] = useState<
    { pageId: string; pageName: string | null; adsSeenInSample: number }[] | null
  >(null);

  const [competitorName, setCompetitorName] = useState("");
  const [website, setWebsite] = useState("");
  const [fbId, setFbId] = useState("");
  const [googleId, setGoogleId] = useState("");
  const [keywords, setKeywords] = useState("");
  const [platforms, setPlatforms] = useState("meta, google");
  const [isActive, setIsActive] = useState(true);

  const load = useCallback(async () => {
    if (!id || !user) return;
    setLoadError(null);
    try {
      const { watch: w } = await expansion.competitor.getWatch(id);
      let pre: { website?: string; facebookRaw?: string; keywords?: string } | null = null;
      if (typeof window !== "undefined") {
        const raw = sessionStorage.getItem(`ghl-cw-prefill-${id}`);
        if (raw) {
          try {
            pre = JSON.parse(raw) as { website?: string; facebookRaw?: string; keywords?: string };
          } catch {
            pre = null;
          }
          sessionStorage.removeItem(`ghl-cw-prefill-${id}`);
        }
      }
      setWatch({
        ...w,
        insights: Array.isArray(w.insights) ? w.insights : [],
        ads: Array.isArray(w.ads) ? w.ads : [],
      });
      if (w.lastScannedAt) setLastScanAt(w.lastScannedAt);
      setCompetitorName(w.competitorName);
      setWebsite(pre?.website ?? w.competitorWebsite ?? "");
      setFbId(pre?.facebookRaw ?? w.competitorFacebookPageId ?? "");
      setGoogleId(w.competitorGoogleAdvertiserId ?? "");
      setKeywords(typeof pre?.keywords === "string" && pre.keywords.length ? pre.keywords : keywordsToString(w.keywords));
      setPlatforms(platformsToString(w.platforms) || "meta, google");
      setIsActive(w.isActive);
      setAdLibKeywordSearch(w.competitorName.trim());
      setAdLibKeywordCandidates(null);
    } catch (e) {
      setLoadError(userFacingError(e));
      setWatch(null);
    }
  }, [id, user]);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    if (user && id) void load();
  }, [user, id, load]);

  async function save() {
    if (!id) return;
    setActionError(null);
    setSaving(true);
    setShowSaved(false);
    try {
      const kw = keywords
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const pl = platforms
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      await expansion.competitor.updateWatch(id, {
        competitorName: competitorName.trim(),
        competitorWebsite: website.trim() || null,
        competitorFacebookPageId: fbId.trim() || null,
        competitorGoogleAdvertiserId: googleId.trim() || null,
        keywords: kw,
        platforms: pl.length ? pl : ["meta"],
        isActive,
      });
      await load();
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3_000);
    } catch (e) {
      setActionError(userFacingError(e));
    } finally {
      setSaving(false);
    }
  }

  async function discoverPageFromCompetitorWebsite() {
    const w = website.trim();
    if (!w) {
      setActionError("Add a website URL above first — we load that page and look for Facebook links in the HTML.");
      return;
    }
    setDiscoveringFromWeb(true);
    setActionError(null);
    setFbResolveMsg(null);
    setFbWebCandidates(null);
    setAdLibKeywordCandidates(null);
    try {
      const r = await expansion.competitor.discoverFacebookPageFromWebsite(w, {
        companyName: competitorName.trim() || undefined,
      });
      if (r.candidates.length === 0) {
        setActionError(r.message ?? "No Facebook Page id could be derived from the website.");
        if (r.foundLinks.length > 0) {
          setFbResolveMsg(
            `Found link(s) on the page but could not convert to an id. Try “Look up Page id” with: ${r.foundLinks[0]!.slice(0, 120)}`
          );
        }
        return;
      }
      setFbId(r.candidates[0]!.pageId);
      setFbWebCandidates(r.candidates);
      const n = r.crawledPageCount;
      const scanLine =
        n > 0
          ? `Scanned ${n} public page(s) on their site (same host, up to a limit). `
          : "";
      let done =
        r.candidates.length > 1
          ? `${scanLine}Found ${r.candidates.length} possible Facebook Pages in HTML — the first is selected. Use the dropdown, then Save settings.`
          : `${scanLine}Page id from their site: ${r.candidates[0]!.pageId}. Click Save settings to keep it.`;
      if (r.googlePlace?.googleMapsUri) {
        done += ` Google Maps: ${r.googlePlace.googleMapsUri}`;
      } else if (r.googlePlace?.note && !r.googlePlace.googleMapsUri) {
        done += ` ${r.googlePlace.note}`;
      }
      setFbResolveMsg(done);
    } catch (e) {
      setActionError(userFacingError(e));
    } finally {
      setDiscoveringFromWeb(false);
    }
  }

  async function discoverAdvertiserPagesFromAdLibraryKeyword() {
    const term = adLibKeywordSearch.trim();
    if (term.length < 2) {
      setActionError("Enter at least 2 characters to search Meta Ad Library (e.g. brand or product name).");
      return;
    }
    setDiscoveringKeywordPages(true);
    setActionError(null);
    setFbResolveMsg(null);
    setAdLibKeywordCandidates(null);
    try {
      const r = await expansion.competitor.discoverMetaPagesFromAdLibrarySearch(term);
      setAdLibKeywordCandidates(r.candidates);
      setFbWebCandidates(null);
      if (r.candidates.length === 0) {
        setFbResolveMsg(null);
        setActionError(r.message ?? "No advertiser Pages found for that keyword.");
        return;
      }
      const top = r.candidates[0]!;
      setFbId(top.pageId);
      const extra =
        r.candidates.length > 1
          ? ` ${r.candidates.length} Pages matched — pick one below if this isn’t the advertiser running their ads.`
          : "";
      setFbResolveMsg(
        `Keyword search: set Page id to ${top.pageId}${top.pageName ? ` (${top.pageName})` : ""}.${extra} Save settings, then scan.`
      );
    } catch (e) {
      setActionError(userFacingError(e));
    } finally {
      setDiscoveringKeywordPages(false);
    }
  }

  async function resolvePageFromAdLibraryId() {
    const raw = adLibIdForResolve.trim();
    if (!raw) {
      setActionError("Paste one numeric Meta Ad Library ad id (the id field on an ad, or from Graph /ads_archive).");
      return;
    }
    setResolvingAdLib(true);
    setActionError(null);
    setFbResolveMsg(null);
    try {
      const r = await expansion.competitor.resolvePageFromAdLibraryId(raw);
      setFbId(r.pageId);
      setAdLibIdForResolve(r.adLibraryId);
      setFbWebCandidates(null);
      if (r.resolvedVia === "page_id") {
        setFbResolveMsg(
          `That number is a Facebook Page id (not a single Library ad id). We set the Page to “${r.pageName || r.pageId}” (page_id ${r.pageId}). Save settings, then run a scan. If you have a true ad id, use the id field on an ad from a scan or ads_archive.`
        );
      } else {
        setFbResolveMsg(
          `From ad id → Page “${r.pageName || r.pageId}” (page_id ${r.pageId}). Save settings, then run a scan to pull their other public ads.`
        );
      }
    } catch (e) {
      setActionError(userFacingError(e));
    } finally {
      setResolvingAdLib(false);
    }
  }

  async function resolveFacebookPageId() {
    const raw = fbId.trim();
    if (!raw) {
      setFbResolveMsg(null);
      setActionError("Paste a Facebook Page URL, Meta Ad Library “View all” link, @handle, or id first.");
      return;
    }
    setResolvingFb(true);
    setActionError(null);
    setFbResolveMsg(null);
    try {
      const r = await expansion.competitor.resolveFacebookPage(raw);
      if (!r.pageId) {
        setActionError(r.message ?? "Could not resolve a Facebook Page id from that text.");
        return;
      }
      setFbId(r.pageId);
      const how =
        r.source === "ad_library"
          ? "from the Ad Library URL (view_all_page_id)"
          : r.source === "graph"
            ? "via Meta lookup"
            : "already a numeric id";
      setFbResolveMsg(`Page id is ${r.pageId} (${how}). Click Save settings below to keep it.`);
    } catch (e) {
      setActionError(userFacingError(e));
    } finally {
      setResolvingFb(false);
    }
  }

  async function runScan() {
    if (!id) return;
    setScanning(true);
    setActionError(null);
    try {
      const res = await expansion.competitor.scanWatch(id);
      const { watch: w, diagnostics } = res;
      setWatch({
        ...w,
        insights: Array.isArray(w.insights) ? w.insights : [],
        ads: Array.isArray(w.ads) ? w.ads : [],
      });
      if (w.lastScannedAt) setLastScanAt(w.lastScannedAt);
      const log = diagnostics?.scanNotes ?? null;
      setLastScanLog(log);
      setLastScanLogAdsCount(Array.isArray(w.ads) ? w.ads.length : 0);
    } catch (e) {
      setActionError(userFacingError(e));
      setLastScanLog(null);
      setLastScanLogAdsCount(null);
    } finally {
      setScanning(false);
    }
  }

  async function remove() {
    if (!id || !confirm("Delete this competitor watch and its data?")) return;
    setActionError(null);
    try {
      await expansion.competitor.deleteWatch(id);
      router.push("/competitors");
    } catch (e) {
      setActionError(userFacingError(e));
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-violet-600" />
      </div>
    );
  }

  if (user && !id) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <AppNav />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-zinc-600">Invalid watch id.</p>
          <Link href="/competitors" className="mt-2 inline-block text-violet-700 hover:underline">← All watches</Link>
        </main>
      </div>
    );
  }

  if (loadError && !watch) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <AppNav />
        <main id="main-content" className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-red-600">{loadError}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Retry
            </button>
            <Link href="/competitors" className="inline-block text-violet-700 hover:underline">
              ← All watches
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!watch) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <AppNav />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <DetailSkeleton />
        </main>
      </div>
    );
  }

  const pageIdForLibrary = fbId.replace(/\D/g, "");
  const metaLibraryUrl =
    fbId.trim() && (pageIdForLibrary.length >= 4 || /^\d+$/.test(fbId.trim()))
      ? `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&is_targeted_country=false&view_all_page_id=${encodeURIComponent(
          /^\d+$/.test(fbId.trim()) ? fbId.trim() : pageIdForLibrary
        )}`
      : null;

  function goUseCampaign(idea: YourCampaignIdea) {
    if (typeof window === "undefined") return;
    const n = `${watch?.competitorName ?? "Competitor"} — ${idea.title}`.slice(0, 120);
    const pLower = idea.platform.toLowerCase();
    const selectedPlatforms: ("meta" | "google" | "tiktok" | "linkedin")[] = pLower.includes("google")
      ? ["google"]
      : pLower.includes("linkedin")
        ? ["linkedin"]
        : pLower.includes("tiktok")
          ? ["tiktok"]
          : ["meta"];
    sessionStorage.setItem(
      "ghl-campaign-prefill",
      JSON.stringify({
        name: n,
        prompt: [idea.angle && `**Angle:** ${idea.angle}`, idea.adCopy, idea.whyItWorks && `**Why it can win:** ${idea.whyItWorks}`]
          .filter(Boolean)
          .join("\n\n"),
        creativePrompt: pLower.includes("google")
          ? "Match Google ad style: clear headline + CTA in description."
          : "High-impact visual; match the angle above in the ad image or video.",
        selectedPlatforms,
      })
    );
    router.push("/?open=create");
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppNav />
      <main id="main-content" className="mx-auto max-w-3xl px-4 py-8">
        <p className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          <strong className="text-zinc-800">Website + competitor name / keywords</strong> are enough for{" "}
          <strong className="text-zinc-800">keyword-only Meta ads</strong> (no Facebook Page id required). With a Page id, scans prefer Page-scoped ads. Save settings in{" "}
          <a href="#competitor-watch-settings" className="font-medium text-violet-700 hover:underline">Watch settings</a>, then run a scan. Env help:{" "}
          <Link href="/competitors#competitor-watch-howto" className="font-medium text-violet-700 hover:underline">Competitors</Link>.
        </p>

        <div className="mt-3 flex flex-wrap gap-2 text-sm text-violet-700">
          <Link href="/competitors" className="hover:underline">← All watches</Link>
          <span className="text-zinc-300">·</span>
          <Link href="/" className="hover:underline">Home</Link>
          <span className="text-zinc-300">·</span>
          <Link href="/content-strategy" className="hover:underline">Content strategy</Link>
        </div>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{watch.competitorName}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {isActive ? (
                <span className="text-emerald-700">Active watch</span>
              ) : (
                <span className="text-amber-700">Paused</span>
              )}
              {lastScanAt && ` · Last scan ${new Date(lastScanAt).toLocaleString()}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runScan()}
              disabled={scanning}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
            >
              {scanning ? "Scanning…" : "Run scan now"}
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
            <button
              type="button"
              onClick={remove}
              className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>

        {actionError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {actionError}
          </div>
        )}

        {lastScanLog && lastScanLog.length > 0 && (() => {
          const adLibPermissionDenied = lastScanLog.some((s) =>
            /does not have permission|Application does not have permission|#10\b|code.?10|2332002|2332004|App role required/i.test(s)
          );
          return (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                lastScanLogAdsCount === 0
                  ? "border-amber-300 bg-amber-50/90 text-amber-950"
                  : "border-zinc-200 bg-white text-zinc-800"
              }`}
              role="status"
              aria-live="polite"
            >
              <p className="font-semibold text-zinc-900">
                {lastScanLogAdsCount === 0
                  ? "Scan finished — no Meta ads were stored"
                  : `Scan finished — ${lastScanLogAdsCount} ad(s) in this watch`}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                This is the server&rsquo;s step-by-step log (not an error from your browser). If you expected ads, read the list below, then
                check the API host: <code className="rounded bg-zinc-100/80 px-0.5">META_AD_LIBRARY_TOKEN</code> is used first when set; otherwise{" "}
                <code className="rounded bg-zinc-100/80 px-0.5">META_APP_ID</code> + <code className="rounded bg-zinc-100/80 px-0.5">META_APP_SECRET</code>{" "}
                (<code className="rounded bg-zinc-100/80 px-0.5">APP_ID|APP_SECRET</code>).
              </p>
              {adLibPermissionDenied && (
                <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50/80 px-3 py-2 text-xs text-violet-950">
                  <p className="font-medium text-violet-900">What this usually means</p>
                  <p className="mt-1 leading-relaxed text-violet-900/90">
                    Meta&rsquo;s <code className="rounded bg-violet-100/80 px-0.5">ads_archive</code> request must use a token from an app
                    that has the right <strong>Ad Library API</strong> access in{" "}
                    <a
                      href="https://developers.facebook.com/apps/"
                      className="font-medium text-violet-800 underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Meta for Developers
                    </a>
                    . When <code className="rounded bg-violet-100/80 px-0.5">META_AD_LIBRARY_TOKEN</code> is set on the server, those calls use it; otherwise{" "}
                    <code className="rounded bg-violet-100/80 px-0.5">META_APP_ID</code> +{" "}
                    <code className="rounded bg-violet-100/80 px-0.5">META_APP_SECRET</code> (app access{" "}
                    <code className="rounded bg-violet-100/80 px-0.5">APP_ID|APP_SECRET</code>). Confirm the app has completed{" "}
                    <strong>Ad Library API</strong> onboarding and is in the right mode. Official:{" "}
                    <a
                      href="https://www.facebook.com/ads/library/api/"
                      className="font-medium text-violet-800 underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ad Library API
                    </a>
                    . Test a token in{" "}
                    <a
                      href="https://developers.facebook.com/tools/explorer/"
                      className="font-medium text-violet-800 underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Graph API Explorer
                    </a>{" "}
                    with a <code className="rounded bg-violet-100/80 px-0.5">GET</code> to{" "}
                    <code className="rounded bg-violet-100/80 px-0.5">/v25.0/ads_archive</code> and the same
                    query params your server uses, until you get 200 and <code className="rounded bg-violet-100/80 px-0.5">data</code> not
                    empty.
                  </p>
                </div>
              )}
              <ul className="mt-3 list-disc space-y-2 pl-5 text-zinc-800">
                {lastScanLog.map((line, i) => (
                  <li key={i} className="leading-snug">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

        {showSaved && <p className="mt-2 text-sm text-emerald-700">Settings saved.</p>}

        <div
          id="competitor-watch-settings"
          className="mt-6 space-y-4 scroll-mt-4 rounded-xl border-2 border-violet-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-base font-semibold text-zinc-900">Watch settings</h2>
          <p className="text-sm text-zinc-600">
            <strong>Facebook Page</strong> is optional: leave it blank and scans query Meta Ad Library by <strong>competitor name</strong> +{" "}
            <strong>keywords</strong>, then keep only ads that match your business name, keywords, or website host (noise reduced before the AI brief).
            With a Page id, scans pull ads for that Page instead (usually sharper).
          </p>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Competitor name</label>
            <input
              value={competitorName}
              onChange={(e) => setCompetitorName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Website</label>
            <input
              value={website}
              onChange={(e) => {
                setWebsite(e.target.value);
                setFbWebCandidates(null);
              }}
              placeholder="https://"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <p className="form-hint mt-1 text-xs text-zinc-500">We fetch this URL from our servers (private IPs blocked).</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700" htmlFor="competitor-facebook-page-id">
              Facebook Page (link or id)
            </label>
            <textarea
              id="competitor-facebook-page-id"
              name="competitorFacebookPageId"
              value={fbId}
              onChange={(e) => {
                setFbId(e.target.value);
                setFbResolveMsg(null);
              }}
              rows={2}
              autoComplete="off"
              placeholder="Meta Ad Library “View all” URL, or facebook.com/…, @PageName, or 1234567890123456"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              aria-describedby="competitor-facebook-page-id-hint"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void discoverPageFromCompetitorWebsite()}
                disabled={discoveringFromWeb}
                className="rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-1.5 text-sm font-medium text-emerald-950 hover:bg-emerald-100 disabled:opacity-50"
                title="Uses the website URL in Watch settings: loads the homepage and finds facebook.com/… in the page (e.g. footer). No need to open Meta."
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
            <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2">
              <p className="text-xs font-medium text-zinc-700">Test: Page id from one Ad Library <strong>ad</strong> id</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Paste the numeric <code className="rounded bg-zinc-100 px-0.5">id</code> of a single ad (same as Graph Archived Ad). The
                server calls <code className="rounded bg-zinc-100 px-0.5">GET /&#123;id&#125;?fields=page_id</code> then fills the Page id
                above for scans.
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  inputMode="numeric"
                  value={adLibIdForResolve}
                  onChange={(e) => setAdLibIdForResolve(e.target.value)}
                  placeholder="Ad Library ad id (digits)"
                  className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                  aria-label="Meta Ad Library ad id"
                />
                <button
                  type="button"
                  onClick={() => void resolvePageFromAdLibraryId()}
                  disabled={resolvingAdLib}
                  className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {resolvingAdLib ? "Resolving…" : "Get Page id from ad id"}
                </button>
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50/80 px-3 py-2">
              <p className="text-xs font-medium text-sky-950">Find the advertiser Page via keyword (management / alternate Page)</p>
              <p className="mt-0.5 text-xs text-sky-900/85">
                When scans show no ads for the Page from their site, Meta may still attribute creatives to another Page. Search Ad Library by a brand or offer phrase; we group matching ads by advertiser Page id so you can pick the right one.
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={adLibKeywordSearch}
                  onChange={(e) => {
                    setAdLibKeywordSearch(e.target.value);
                    setAdLibKeywordCandidates(null);
                  }}
                  placeholder="e.g. competitor brand name"
                  className="min-w-0 flex-1 rounded border border-sky-200 bg-white px-2 py-1.5 text-sm"
                  aria-label="Keyword for Meta Ad Library search"
                />
                <button
                  type="button"
                  onClick={() => void discoverAdvertiserPagesFromAdLibraryKeyword()}
                  disabled={discoveringKeywordPages}
                  className="shrink-0 rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-sm font-medium text-sky-950 hover:bg-sky-100 disabled:opacity-50"
                >
                  {discoveringKeywordPages ? "Searching…" : "Search advertisers by keyword"}
                </button>
              </div>
            </div>
            {adLibKeywordCandidates && adLibKeywordCandidates.length > 1 && (
              <div className="mt-2 max-w-lg">
                <label className="block text-xs font-medium text-zinc-600" htmlFor="fb-pick-keyword-candidate">
                  Pick the Page that matches who runs their ads (agency names often appear here):
                </label>
                <select
                  id="fb-pick-keyword-candidate"
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                  value={fbId}
                  onChange={(e) => setFbId(e.target.value)}
                >
                  {adLibKeywordCandidates.map((c) => (
                    <option key={c.pageId} value={c.pageId}>
                      {c.pageId}
                      {c.pageName ? ` — ${c.pageName.slice(0, 80)}` : ""} ({c.adsSeenInSample} ad{c.adsSeenInSample === 1 ? "" : "s"} in sample)
                    </option>
                  ))}
                </select>
              </div>
            )}
            {fbWebCandidates && fbWebCandidates.length > 1 && (
              <div className="mt-2 max-w-lg">
                <label className="block text-xs font-medium text-zinc-600" htmlFor="fb-pick-website-candidate">
                  If more than one Facebook link was found, pick the Page to track:
                </label>
                <select
                  id="fb-pick-website-candidate"
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                  value={fbId}
                  onChange={(e) => setFbId(e.target.value)}
                >
                  {fbWebCandidates.map((c) => (
                    <option key={c.pageId} value={c.pageId}>
                      {c.pageId} — {c.pageUrl.replace(/^https?:\/\//, "").slice(0, 80)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <p id="competitor-facebook-page-id-hint" className="form-hint mt-1 text-xs text-zinc-500">
              <strong>Find Page id from website</strong> walks many same-domain pages (not only the home page), up to a
              time/size cap, and looks for <code className="rounded bg-zinc-100 px-0.5">facebook.com</code> in the HTML. With{" "}
              <code className="rounded bg-zinc-100 px-0.5">GOOGLE_PLACES_API_KEY</code> on the API, we also run Google Places
              (New) for the <strong>competitor name</strong> to find an official website + Google Maps link — Google does
              <strong> not</strong> return Facebook in that API, but the listed website is fetched once for extra
              social links. <strong>Look up (paste text)</strong> is for a Page URL, Ad Library link, or @handle. Then{" "}
              <strong>Save settings</strong>.
            </p>
          </div>
          {metaLibraryUrl && (
            <a
              href={metaLibraryUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm font-medium text-violet-700 hover:underline"
            >
              Open Meta Ad Library for this page →
            </a>
          )}
          <div>
            <label className="block text-sm font-medium text-zinc-700">Google advertiser ID (optional, future use)</label>
            <input
              value={googleId}
              onChange={(e) => setGoogleId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Keywords</label>
            <textarea
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Platforms (comma-separated)</label>
            <input
              value={platforms}
              onChange={(e) => setPlatforms(e.target.value)}
              placeholder="meta, google, tiktok"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-800">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
            Active (turn off to pause without deleting)
          </label>
        </div>

        <p className="mt-6 text-sm text-zinc-600">
          <strong>Run scan</strong> fetches the public website (if set), Meta Ad Library when configured (Facebook Page id <strong>or</strong> competitor name + keywords), and stores an AI brief when OpenAI is set. This tool <strong>does not</strong> post to Facebook — it only
          reads public data and saves to your account.
        </p>

        <section className="mt-10" aria-label="Competitor ads from Meta Ad Library">
          <h2 className="text-lg font-semibold text-zinc-900">What they are running (Meta Ad Library)</h2>
          <p className="mt-1 text-sm text-zinc-500">
            These are <strong>public creative snapshots</strong> from Meta Ad Library (Page-scoped or keyword discovery). Not a full Ads Manager export — closest live view without their login.
          </p>
          {(watch.ads ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-zinc-600">
              No Meta ads stored yet. Either add a <strong>Facebook Page</strong> for Page-level pulls, or leave Page blank and use <strong>competitor name</strong> +{" "}
              <strong>keywords</strong> (keyword-only mode — server filters unrelated ads). Set tokens on the API host (
              <code className="rounded bg-zinc-100 px-1">META_AD_LIBRARY_TOKEN</code> or{" "}
              <code className="rounded bg-zinc-100 px-1">META_APP_ID</code> + <code className="rounded bg-zinc-100 px-1">META_APP_SECRET</code>), then run a scan. If you see ads on{" "}
              <a
                className="font-medium text-violet-700 hover:underline"
                href="https://www.facebook.com/ads/library"
                target="_blank"
                rel="noreferrer"
              >
                Meta&apos;s public Ad Library
              </a>{" "}
              but not here, their ads may run under a <strong>different</strong> Facebook Page — use{" "}
              <strong>Search advertisers by keyword</strong> or <strong>Get Page id from ad id</strong> in Watch settings.
              Also confirm <code className="rounded bg-zinc-100 px-1">META_AD_LIBRARY_COUNTRIES</code> includes regions their ads target (e.g.{" "}
              <code className="rounded bg-zinc-100 px-0.5">US,GB,DE</code>).
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {(watch.ads ?? []).map((ad) => (
                <li key={ad.id} className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm">
                  <p className="text-xs font-medium uppercase text-zinc-500">Meta</p>
                  <p className="mt-0.5 font-mono text-xs text-zinc-500">Library id: {ad.adLibraryId}</p>
                  {ad.headline && <p className="mt-1 font-medium text-zinc-900">{ad.headline}</p>}
                  {ad.bodyText && <p className="mt-1 text-zinc-700">{ad.bodyText}</p>}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    {ad.mediaUrl && (
                      <a
                        href={ad.mediaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-violet-700 hover:underline"
                      >
                        Open Ad Library snapshot (preview) →
                      </a>
                    )}
                    {ad.destinationUrl && (
                      <a href={ad.destinationUrl} target="_blank" rel="noreferrer" className="text-violet-700 hover:underline">
                        Destination URL →
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="competitor-insights" className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-900">Intelligence & history</h2>
          <p className="mt-1 text-sm text-zinc-500">Newest first. Each run is a full snapshot; compare over time to see shifts in messaging and ads.</p>
          {(watch.insights ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-zinc-600">Run a scan to generate the first brief.</p>
          ) : (
            <ul className="mt-4 space-y-6">
              {(watch.insights ?? []).map((ins) => {
                const themes = stringArrayFromJson(ins.topThemes);
                const angles = stringArrayFromJson(ins.suggestedCounterAngles);
                const strong = strongestAdsFromJson(ins.strongestAds);
                const pack = parseCompetitivePack(ins.competitivePack);
                return (
                  <li
                    key={ins.id}
                    className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
                  >
                    <div className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-2">
                      <p className="text-xs text-zinc-500">{new Date(ins.generatedAt).toLocaleString()}</p>
                    </div>
                    <div className="p-4">
                      {renderInsightSummaryText(ins.summary)}
                      {pack && (
                        <div className="mt-6 space-y-5 border-t border-zinc-100 pt-5">
                          <div>
                            <h3 className="text-sm font-semibold text-zinc-900">What they do (marketing read)</h3>
                            <p className="mt-2 text-sm text-zinc-700 whitespace-pre-wrap">{pack.theirPlaybook}</p>
                          </div>
                          {pack.howToWin.length > 0 && (
                            <div>
                              <h3 className="text-sm font-semibold text-zinc-900">How to beat them</h3>
                              <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm text-zinc-800">
                                {pack.howToWin.map((h, i) => (
                                  <li key={i}>{h}</li>
                                ))}
                              </ol>
                            </div>
                          )}
                          {pack.theirAdTactics.length > 0 && (
                            <div>
                              <h3 className="text-sm font-semibold text-zinc-900">What their ads are doing (tactics)</h3>
                              <ul className="mt-2 space-y-2 text-sm text-zinc-800">
                                {pack.theirAdTactics.map((a, j) => (
                                  <li key={j} className="rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2">
                                    <p className="font-medium text-amber-950">{a.headline}</p>
                                    <p className="mt-0.5 text-amber-900/90">{a.tactic}</p>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {pack.yourCampaigns.length > 0 && (
                            <div>
                              <h3 className="text-sm font-semibold text-zinc-900">Campaigns you can run (starter copy)</h3>
                              <p className="mt-1 text-xs text-zinc-500">Use a suggestion below — we will open <strong>Home</strong> with the text filled into a new campaign draft.</p>
                              <ul className="mt-3 space-y-4">
                                {pack.yourCampaigns.map((idea, k) => (
                                  <li key={k} className="rounded-xl border border-violet-200 bg-violet-50/30 p-4">
                                    <p className="font-semibold text-violet-950">{idea.title}</p>
                                    <p className="mt-1 text-xs text-zinc-600">
                                      Suggested: <span className="font-medium text-zinc-800">{idea.platform}</span>
                                    </p>
                                    {idea.angle && <p className="mt-2 text-sm text-zinc-800">{idea.angle}</p>}
                                    <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800">{idea.adCopy}</p>
                                    {idea.whyItWorks && <p className="mt-2 text-xs text-zinc-600">Why: {idea.whyItWorks}</p>}
                                    <button
                                      type="button"
                                      onClick={() => goUseCampaign(idea)}
                                      className="mt-3 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
                                    >
                                      Use for new campaign on Home
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                      {themes.length > 0 && (
                        <div className="mt-4">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Themes</h3>
                          <ul className="mt-2 flex flex-wrap gap-2">
                            {themes.map((t) => (
                              <li
                                key={t}
                                className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-900"
                              >
                                {t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {angles.length > 0 && (
                        <div className="mt-4">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Your counter-angles</h3>
                          <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm text-zinc-800">
                            {angles.map((a) => (
                              <li key={a}>{a}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                      {strong.length > 0 && (
                        <div className="mt-4">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Strongest ad signals</h3>
                          <ul className="mt-2 space-y-2">
                            {strong.map((s, j) => (
                              <li key={j} className="rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-2 text-sm text-zinc-800">
                                <p className="font-medium text-zinc-900">{s.headline}</p>
                                {s.note && <p className="mt-1 text-xs text-zinc-600">{s.note}</p>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

export default function CompetitorDetailPage() {
  return (
    <ExpansionProductGate productKey="competitors">
      <CompetitorDetailInner />
    </ExpansionProductGate>
  );
}
