"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppNav from "@/components/AppNav";
import { ExpansionProductGate } from "@/components/ExpansionProductGate";
import { renderInsightSummaryText } from "@/components/competitorUtils";
import { useAuth } from "@/contexts/AuthContext";
import {
  expansion,
  type MetaAdHarvestAdRow,
  type MetaAdHarvestRunRow,
  type MetaHarvestBrandRow,
  type MetaHarvestInsightRow,
  type MetaHarvestReportPayload,
  type MetaHarvestReportQueuedResponse,
  type MetaHarvestReportSyncResponse,
} from "@/lib/api";
import { userFacingError } from "@/lib/userFacingError";

type HarvestTab = "collect" | "reports" | "saved";

const BRAND_AD_PICK_CAP = 48;
const LANDSCAPE_AD_PICK_CAP = 80;

function isQueuedHarvestResponse(
  x: MetaHarvestReportSyncResponse | MetaHarvestReportQueuedResponse
): x is MetaHarvestReportQueuedResponse {
  return "backgroundAccepted" in x && x.backgroundAccepted === true;
}

/** Meta snapshot URLs are HTML pages — use a scaled iframe + link; never `<img src>`. */
function isMetaAdLibrarySnapshotUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^www\./i, "").toLowerCase();
    return (
      (h === "facebook.com" || h === "m.facebook.com" || h === "lm.facebook.com") &&
      (u.pathname.includes("/ads/") || u.pathname.includes("render_ad"))
    );
  } catch {
    return false;
  }
}

/** Compact Meta Library snapshot or remote image thumbnail. */
function HarvestAdPreview({
  mediaUrl,
  compact = true,
}: {
  mediaUrl: string | null;
  compact?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  if (!mediaUrl) {
    return (
      <div
        className={
          compact
            ? "flex h-[102px] w-[118px] shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-1 text-center text-[10px] leading-snug text-zinc-500"
            : "flex h-[132px] w-[148px] shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-2 text-center text-[11px] leading-snug text-zinc-500"
        }
      >
        No creative URL stored for this row
      </div>
    );
  }

  if (isMetaAdLibrarySnapshotUrl(mediaUrl)) {
    const scale = compact ? 0.38 : 0.46;
    const iw = 300;
    const ih = 480;
    return (
      <div
        className={
          compact
            ? "relative h-[102px] w-[118px] shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 shadow-inner"
            : "relative h-[132px] w-[148px] shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 shadow-inner"
        }
      >
        <iframe
          src={mediaUrl}
          title="Meta Ad Library creative preview"
          className="pointer-events-none absolute left-0 top-0 border-0 bg-white"
          style={{
            width: iw,
            height: ih,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <a
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-0 left-0 right-0 z-[1] truncate bg-white/95 px-1 py-0.5 text-center text-[10px] font-semibold text-violet-700 hover:bg-white"
        >
          Open on Meta ↗
        </a>
      </div>
    );
  }

  const isProbablyVideo =
    /\.(mp4|webm|mov|m3u8)(\?|$)/i.test(mediaUrl) || /\bvideo\b/i.test(mediaUrl) || /\/v\//i.test(mediaUrl);

  if (isProbablyVideo) {
    return (
      <a
        href={mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={
          compact
            ? "flex h-[102px] w-[118px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-zinc-700 bg-gradient-to-b from-zinc-700 to-zinc-900 px-2 text-center text-[10px] font-medium leading-tight text-white hover:opacity-95"
            : "flex h-[132px] w-[148px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-zinc-700 bg-gradient-to-b from-zinc-700 to-zinc-900 px-2 text-center text-[11px] font-medium leading-tight text-white hover:opacity-95"
        }
      >
        <span className="text-sm" aria-hidden>
          ▶
        </span>
        Play video
      </a>
    );
  }

  if (imgFailed) {
    return (
      <a
        href={mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={
          compact
            ? "flex h-[102px] w-[118px] shrink-0 flex-col items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 px-2 text-center text-[10px] font-medium text-violet-700 hover:bg-zinc-200"
            : "flex h-[132px] w-[148px] shrink-0 flex-col items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 px-2 text-center text-[11px] font-medium text-violet-700 hover:bg-zinc-200"
        }
      >
        Open link (preview blocked)
      </a>
    );
  }

  const box = compact ? "h-[102px] w-[118px]" : "h-[132px] w-[148px]";
  return (
    <a
      href={mediaUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`block shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 ring-offset-2 hover:ring-2 hover:ring-violet-400 ${box}`}
      title="Open creative in new tab"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- remote CDN URLs */}
      <img src={mediaUrl} alt="" className="h-full w-full object-cover" onError={() => setImgFailed(true)} />
    </a>
  );
}

function HarvestInner() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [tab, setTab] = useState<HarvestTab>("collect");

  const [kwInput, setKwInput] = useState("cryotherapy, cold therapy spa, wellness studio");
  const [label, setLabel] = useState("");
  const [harvestBusy, setHarvestBusy] = useState(false);
  const [runs, setRuns] = useState<MetaAdHarvestRunRow[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);

  const [brandQ, setBrandQ] = useState("");
  const [brands, setBrands] = useState<MetaHarvestBrandRow[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [selectedPages, setSelectedPages] = useState<Record<string, boolean>>({});

  const [reportName, setReportName] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportPreview, setReportPreview] = useState<MetaHarvestReportPayload | null>(null);

  const [excludeInput, setExcludeInput] = useState("");
  const [strictFilter, setStrictFilter] = useState(true);
  const [runInBackground, setRunInBackground] = useState(false);

  const [landscapeRunId, setLandscapeRunId] = useState("");
  const [landscapeTopic, setLandscapeTopic] = useState("");
  const [landscapeBusy, setLandscapeBusy] = useState(false);
  const [landscapePreview, setLandscapePreview] = useState<MetaHarvestReportPayload | null>(null);

  const [adPickRunId, setAdPickRunId] = useState("");
  const [adPickRows, setAdPickRows] = useState<MetaAdHarvestAdRow[]>([]);
  const [adPickLoading, setAdPickLoading] = useState(false);
  const [selectedAdLibraryIds, setSelectedAdLibraryIds] = useState<Record<string, boolean>>({});
  const [expandedAdPickRows, setExpandedAdPickRows] = useState<Record<string, boolean>>({});
  const [adLangFilter, setAdLangFilter] = useState<"all" | "en" | "es">("all");

  const [insights, setInsights] = useState<MetaHarvestInsightRow[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    if (!user) return;
    setRunsLoading(true);
    try {
      const { runs: r } = await expansion.competitor.listMetaHarvestRuns();
      setRuns(r);
    } catch (e) {
      setError(userFacingError(e));
    } finally {
      setRunsLoading(false);
    }
  }, [user]);

  const loadInsights = useCallback(async () => {
    if (!user) return;
    setInsightsLoading(true);
    try {
      const { insights: list } = await expansion.competitor.listMetaHarvestInsights();
      setInsights(list);
    } catch (e) {
      setError(userFacingError(e));
    } finally {
      setInsightsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) void loadRuns();
  }, [user, loadRuns]);

  useEffect(() => {
    if (user && tab === "saved") void loadInsights();
  }, [user, tab, loadInsights]);

  const hasPendingInsights = useMemo(() => insights.some((i) => i.status === "pending"), [insights]);

  const completedHarvestRuns = useMemo(
    () => runs.filter((r) => r.status === "completed" && (r.adsStored > 0 || (r._count?.ads ?? 0) > 0)),
    [runs]
  );

  const adPickRowsFiltered = useMemo(() => {
    if (adLangFilter === "all") return adPickRows;
    return adPickRows.filter((a) => {
      const langs = a.languages;
      if (!langs?.length) return false;
      return langs.includes(adLangFilter);
    });
  }, [adPickRows, adLangFilter]);

  useEffect(() => {
    setSelectedAdLibraryIds({});
    setExpandedAdPickRows({});
  }, [adPickRunId]);

  useEffect(() => {
    if (!user || tab !== "reports" || !adPickRunId.trim()) {
      setAdPickRows([]);
      setAdPickLoading(false);
      return;
    }
    let cancelled = false;
    setAdPickLoading(true);
    void expansion.competitor
      .getMetaHarvestRun(adPickRunId.trim())
      .then(({ run }) => {
        if (!cancelled) setAdPickRows(run.ads ?? []);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(userFacingError(e));
          setAdPickRows([]);
        }
      })
      .finally(() => {
        if (!cancelled) setAdPickLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, tab, adPickRunId]);

  useEffect(() => {
    if (tab !== "saved" || !hasPendingInsights) return;
    const id = window.setInterval(() => void loadInsights(), 4000);
    return () => window.clearInterval(id);
  }, [tab, hasPendingInsights, loadInsights]);

  async function pollInsightUntilReady(id: string) {
    for (let i = 0; i < 72; i++) {
      try {
        const { insight } = await expansion.competitor.getMetaHarvestInsight(id);
        if (insight.status !== "pending") {
          await loadInsights();
          setSelectedInsightId(insight.id);
          return insight;
        }
      } catch {
        break;
      }
      await new Promise((r) => setTimeout(r, 2500));
    }
    await loadInsights();
    return null;
  }

  async function runHarvest() {
    const keywords = kwInput
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2);
    if (!keywords.length) {
      setError("Add at least one keyword (three or more letters each).");
      return;
    }
    setHarvestBusy(true);
    setError(null);
    setInfo(null);
    try {
      await expansion.competitor.createMetaHarvestRun({
        keywords,
        label: label.trim() || undefined,
      });
      setInfo("Collection finished. New ads are ready to browse and report on.");
      await loadRuns();
      await searchBrandsInternal(brandQ);
    } catch (e) {
      setError(userFacingError(e));
    } finally {
      setHarvestBusy(false);
    }
  }

  async function searchBrandsInternal(q: string) {
    setBrandsLoading(true);
    try {
      const { brands: b } = await expansion.competitor.listMetaHarvestBrands(q.trim() || undefined);
      setBrands(b);
    } catch (e) {
      setError(userFacingError(e));
    } finally {
      setBrandsLoading(false);
    }
  }

  async function searchBrands() {
    setError(null);
    await searchBrandsInternal(brandQ);
  }

  function parseExcludePhrases(): string[] {
    return excludeInput
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 2)
      .slice(0, 24);
  }

  function pickedAdLibraryIds(): string[] {
    return Object.entries(selectedAdLibraryIds)
      .filter(([, v]) => v)
      .map(([id]) => id);
  }

  function toggleAdLibraryPick(adLibraryId: string) {
    setSelectedAdLibraryIds((prev) => ({ ...prev, [adLibraryId]: !prev[adLibraryId] }));
  }

  function toggleAdPickRowExpanded(adLibraryId: string) {
    setExpandedAdPickRows((prev) => ({ ...prev, [adLibraryId]: !prev[adLibraryId] }));
  }

  async function generateLandscape() {
    setError(null);
    setInfo(null);
    const picks = pickedAdLibraryIds();
    if (picks.length > 0 && !adPickRunId.trim()) {
      setError("Choose the collection your selected ads belong to (Pick specific ads), then try again.");
      return;
    }
    setLandscapeBusy(true);
    if (!runInBackground) {
      setLandscapePreview(null);
    }
    try {
      const body: Parameters<(typeof expansion.competitor)["createMetaHarvestLandscapeReport"]>[0] = {
        harvestRunId:
          picks.length > 0 ? adPickRunId.trim() || undefined : landscapeRunId.trim() || undefined,
        ...(picks.length > 0 ? { adLibraryIds: picks.slice(0, LANDSCAPE_AD_PICK_CAP) } : {}),
        topicHint: landscapeTopic.trim() || undefined,
        excludePhrases: parseExcludePhrases(),
        strictRelevanceFilter: strictFilter,
        runInBackground,
      };
      if (picks.length > LANDSCAPE_AD_PICK_CAP) {
        setInfo(`Using the first ${LANDSCAPE_AD_PICK_CAP} of ${picks.length} selected ads (limit per overview).`);
      }
      const res = await expansion.competitor.createMetaHarvestLandscapeReport(body);
      if (isQueuedHarvestResponse(res)) {
        setInfo("Your market overview is generating. You can open Saved reports to watch it finish, or keep working elsewhere.");
        setTab("saved");
        void pollInsightUntilReady(res.insight.id);
      } else {
        setLandscapePreview(res.report);
        setInfo("Market overview saved to your library.");
        void loadInsights();
      }
    } catch (e) {
      setError(userFacingError(e));
    } finally {
      setLandscapeBusy(false);
    }
  }

  async function generateReport() {
    setError(null);
    setInfo(null);
    const picks = pickedAdLibraryIds();
    const facebookPageIds = Object.entries(selectedPages)
      .filter(([, v]) => v)
      .map(([id]) => id.replace(/\D/g, ""))
      .filter(Boolean);
    if (!picks.length && !facebookPageIds.length) {
      setError("Select one or more advertisers from the list, or choose specific ads below, before building a focused report.");
      return;
    }
    setReportBusy(true);
    if (!runInBackground) {
      setReportPreview(null);
    }
    try {
      const res = await expansion.competitor.createMetaHarvestReport({
        ...(picks.length > 0
          ? { adLibraryIds: picks.slice(0, BRAND_AD_PICK_CAP) }
          : { facebookPageIds }),
        competitorDisplayName: reportName.trim() || undefined,
        excludePhrases: parseExcludePhrases(),
        strictRelevanceFilter: strictFilter,
        runInBackground,
      });
      if (picks.length > BRAND_AD_PICK_CAP) {
        setInfo(`Used the first ${BRAND_AD_PICK_CAP} of ${picks.length} selected ads (limit per summary).`);
      }
      if (isQueuedHarvestResponse(res)) {
        setInfo("Your advertiser report is generating. Check Saved reports for the finished brief.");
        setTab("saved");
        void pollInsightUntilReady(res.insight.id);
      } else {
        setReportPreview(res.report);
        setInfo("Focused report saved to your library.");
        void loadInsights();
      }
    } catch (e) {
      setError(userFacingError(e));
    } finally {
      setReportBusy(false);
    }
  }

  function togglePage(pid: string) {
    setSelectedPages((prev) => ({ ...prev, [pid]: !prev[pid] }));
  }

  const selectedInsight = insights.find((x) => x.id === selectedInsightId) ?? null;

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
      <main id="main-content" className="mx-auto max-w-4xl px-4 py-8 pb-16">
        <div className="flex flex-wrap gap-2 text-sm text-zinc-600">
          <Link href="/competitors" className="text-violet-700 hover:underline">
            Competitor watches
          </Link>
          <span className="text-zinc-300">·</span>
          <Link href="/" className="hover:underline">
            Home
          </Link>
        </div>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900">Ad library research</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">
          Collect public Meta ads by topic, spot what competitors are saying, then get plain-language summaries—either across the whole
          collection or for hand-picked advertisers. Irrelevant sponsors (for example clinics you do not compete with) can be filtered out
          before summaries are written.
        </p>

        <div
          className="mt-6 flex gap-1 rounded-xl border border-zinc-200 bg-white p-1 shadow-sm"
          role="tablist"
          aria-label="Research steps"
        >
          {(
            [
              ["collect", "Collect ads"],
              ["reports", "Summaries"],
              ["saved", "Saved reports"],
            ] as const
          ).map(([id, lab]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => {
                setTab(id);
                setError(null);
              }}
              className={
                tab === id
                  ? "flex-1 rounded-lg bg-violet-600 px-3 py-2.5 text-center text-sm font-medium text-white shadow-sm"
                  : "flex-1 rounded-lg px-3 py-2.5 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              }
            >
              {lab}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
            {error}
          </div>
        )}
        {info && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
            {info}
          </div>
        )}

        {tab === "collect" && (
          <div className="mt-8 space-y-8">
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">Collect ads from Meta’s ad library</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Enter words your customers might search—services, cities, problems you solve. We gather a sample of active ads and group them
                by advertiser so you can review what shows up for those topics.
              </p>
              <label className="mt-4 block text-xs font-medium text-zinc-500" htmlFor="harvest-keywords">
                Keywords (comma or line separated, up to 12)
              </label>
              <textarea
                id="harvest-keywords"
                value={kwInput}
                onChange={(e) => setKwInput(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none ring-violet-500/30 focus:border-violet-400 focus:ring-2"
                placeholder="Example: dental implants Austin, smile makeover"
              />
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                Meta surfaces creatives in the languages they target—English searches can still return Spanish copy. Write keywords in the language you want when possible. Your backend can restrict{" "}
                <strong>new</strong> pulls with env{" "}
                <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono">META_AD_LIBRARY_CONTENT_LANGUAGES=en</code> (comma-separated ISO codes).
              </p>
              <label className="mt-3 block text-xs font-medium text-zinc-500" htmlFor="harvest-label">
                Friendly name (optional)
              </label>
              <input
                id="harvest-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Example: Spring competitor sweep"
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none ring-violet-500/30 focus:border-violet-400 focus:ring-2"
              />
              <button
                type="button"
                disabled={harvestBusy}
                onClick={() => void runHarvest()}
                className="mt-4 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {harvestBusy ? "Collecting…" : "Collect ads"}
              </button>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">Recent collections</h2>
              {runsLoading ? (
                <p className="mt-3 text-sm text-zinc-500">Loading…</p>
              ) : runs.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-600">Nothing yet—run your first collection above.</p>
              ) : (
                <ul className="mt-4 divide-y divide-zinc-100">
                  {runs.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm">
                      <div>
                        <span className="font-medium text-zinc-900">{r.label || "Collection"}</span>
                        <span className="text-zinc-500"> · </span>
                        <span className="capitalize text-zinc-600">{r.status}</span>
                      </div>
                      <span className="text-zinc-500">
                        {r.adsStored || r._count?.ads || 0} ads · {new Date(r.createdAt).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-xs text-zinc-500">
                Large searches can take a little while. When the status shows completed, switch to Summaries to analyze what you collected.
              </p>
            </section>
          </div>
        )}

        {tab === "reports" && (
          <div className="mt-8 space-y-6">
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">Keep summaries on-topic</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Broad keywords sometimes pull unrelated advertisers. List themes or business types you want removed (they are matched against
                advertiser names and ad copy). Turning on extra tightening asks the assistant to drop more edge cases—helpful when two
                industries share similar words.
              </p>
              <textarea
                value={excludeInput}
                onChange={(e) => setExcludeInput(e.target.value)}
                rows={2}
                className="mt-3 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none ring-violet-500/30 focus:border-violet-400 focus:ring-2"
                placeholder="Example: sperm bank, fertility clinic, egg freezing"
              />
              <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm text-zinc-800">
                <input
                  type="checkbox"
                  checked={strictFilter}
                  onChange={(e) => setStrictFilter(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
                />
                <span>
                  <span className="font-medium text-zinc-900">Tighter relevance</span>
                  <span className="mt-0.5 block text-zinc-600">
                    Recommended when your keywords could mean more than one kind of business.
                  </span>
                </span>
              </label>
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={runInBackground}
                  onChange={(e) => setRunInBackground(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
                />
                <span>
                  <span className="font-medium text-zinc-900">Generate in the background</span>
                  <span className="mt-0.5 block text-zinc-600">
                    Saves each summary to Saved reports while it runs—fine to leave this page and come back.
                  </span>
                </span>
              </label>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">Pick specific ads (optional)</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Browse like Ads Manager: each row shows scrolling primary text so several ads fit on screen at once. Creatives load from Meta’s
                snapshot viewer (embedded); use &ldquo;Open on Meta ↗&rdquo; if the thumbnail looks blank—some browsers block embedded Facebook
                pages. Meta matches keywords to ad language (Spanish often appears next to English ads); filter below when we know languages from
                the API, or set backend env{" "}
                <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs">META_AD_LIBRARY_CONTENT_LANGUAGES=en</code> so{" "}
                <strong>new</strong> collections prefer English copy.
              </p>
              <label className="mt-4 block text-xs font-medium text-zinc-500" htmlFor="ad-pick-run">
                Collection to browse
              </label>
              <select
                id="ad-pick-run"
                value={adPickRunId}
                onChange={(e) => setAdPickRunId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-violet-500/30 focus:border-violet-400 focus:ring-2"
              >
                <option value="">— None —</option>
                {completedHarvestRuns.map((r) => (
                  <option key={r.id} value={r.id}>
                    {(r.label || "Collection").slice(0, 56)} · {r.adsStored || r._count?.ads || 0} ads ·{" "}
                    {new Date(r.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
              {adPickRunId.trim() && adPickLoading ? (
                <p className="mt-4 text-sm text-zinc-500">Loading ads…</p>
              ) : null}
              {adPickRunId.trim() && !adPickLoading && adPickRows.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-600">No ads in this slice—try another collection or recollect.</p>
              ) : null}
              {adPickRows.length > 0 ? (
                <div className="mt-4">
                  <div className="flex flex-wrap items-end gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-500" htmlFor="ad-lang-filter">
                        Filter table by Meta language tags
                      </label>
                      <select
                        id="ad-lang-filter"
                        value={adLangFilter}
                        onChange={(e) => setAdLangFilter(e.target.value as "all" | "en" | "es")}
                        className="mt-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm outline-none ring-violet-500/30 focus:border-violet-400 focus:ring-2"
                      >
                        <option value="all">All languages</option>
                        <option value="en">English only</option>
                        <option value="es">Spanish only</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const next: Record<string, boolean> = {};
                        for (const a of adPickRowsFiltered) next[a.adLibraryId] = true;
                        setSelectedAdLibraryIds(next);
                      }}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                    >
                      Select all listed
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAdLibraryIds({})}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                    >
                      Clear selection
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    Showing {adPickRowsFiltered.length} of {adPickRows.length} ads · {pickedAdLibraryIds().length} selected · up to{" "}
                    {BRAND_AD_PICK_CAP} for focused summary · up to {LANDSCAPE_AD_PICK_CAP} for market overview
                  </p>
                  {adPickRows.length > 0 && adPickRowsFiltered.length === 0 ? (
                    <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                      No ads match this language filter (Meta did not tag languages on these rows). Choose &ldquo;All languages&rdquo; or collect
                      again with English-only filtering on the server.
                    </p>
                  ) : null}
                  <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                    <div className="max-h-[min(88vh,960px)] overflow-auto">
                      <table className="w-full min-w-[940px] border-collapse text-left text-sm">
                        <caption className="sr-only">
                          Harvested ads from this collection. Select rows to include in competitive summaries.
                        </caption>
                        <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-100 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                          <tr>
                            <th scope="col" className="w-10 px-2 py-2.5">
                              #
                            </th>
                            <th scope="col" className="w-11 px-1 py-2.5">
                              Use
                            </th>
                            <th scope="col" className="w-[126px] px-2 py-2">
                              Creative
                            </th>
                            <th scope="col" className="min-w-[140px] px-2 py-2">
                              Advertiser
                            </th>
                            <th scope="col" className="min-w-[220px] max-w-[280px] px-2 py-2">
                              Primary text
                            </th>
                            <th scope="col" className="min-w-[140px] max-w-[200px] px-2 py-2">
                              Headline
                            </th>
                            <th scope="col" className="w-[72px] px-1 py-2 text-center">
                              Lang
                            </th>
                            <th scope="col" className="min-w-[120px] px-2 py-2">
                              Library ID
                            </th>
                            <th scope="col" className="w-[96px] px-1 py-2">
                              More
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 bg-white">
                          {adPickRowsFiltered.map((a, idx) => {
                            const pickId = `ad-pick-${a.adLibraryId}`;
                            const expanded = !!expandedAdPickRows[a.adLibraryId];
                            return (
                              <Fragment key={a.id}>
                                <tr className="align-top hover:bg-zinc-50/90">
                                  <td className="whitespace-nowrap px-2 py-1.5 align-top text-xs text-zinc-400">{idx + 1}</td>
                                  <td className="px-1 py-1.5 align-top">
                                    <input
                                      id={pickId}
                                      type="checkbox"
                                      checked={!!selectedAdLibraryIds[a.adLibraryId]}
                                      onChange={() => toggleAdLibraryPick(a.adLibraryId)}
                                      aria-label={`Include ad ${idx + 1} from ${a.pageName || "advertiser"} in summary`}
                                      className="mt-0.5 rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
                                    />
                                  </td>
                                  <td className="px-1 py-1.5 align-top">
                                    <HarvestAdPreview mediaUrl={a.mediaUrl} compact />
                                  </td>
                                  <td className="max-w-[180px] px-2 py-1.5 align-top">
                                    <label htmlFor={pickId} className="cursor-pointer">
                                      <span className="text-xs font-semibold text-zinc-900">{a.pageName || "Advertiser"}</span>
                                      <span className="mt-0.5 block font-mono text-[10px] text-zinc-500">{a.facebookPageId}</span>
                                    </label>
                                  </td>
                                  <td className="max-w-[280px] min-w-[200px] px-2 py-1.5 align-top">
                                    <label htmlFor={pickId} className="cursor-pointer">
                                      {a.bodyText ? (
                                        <span className="block max-h-[4.75rem] overflow-y-auto whitespace-pre-wrap break-words text-[11px] leading-snug text-zinc-800 [scrollbar-width:thin]">
                                          {a.bodyText}
                                        </span>
                                      ) : (
                                        <span className="text-[11px] text-zinc-400 italic">No primary text</span>
                                      )}
                                    </label>
                                  </td>
                                  <td className="max-w-[200px] px-2 py-1.5 align-top">
                                    <label htmlFor={pickId} className="cursor-pointer">
                                      {a.headline ? (
                                        <span className="block max-h-[2.62rem] overflow-y-auto whitespace-pre-wrap break-words text-[11px] font-semibold leading-snug text-zinc-900 [scrollbar-width:thin]">
                                          {a.headline}
                                        </span>
                                      ) : (
                                        <span className="text-[11px] text-zinc-400 italic">—</span>
                                      )}
                                    </label>
                                  </td>
                                  <td className="px-1 py-1.5 align-top text-center">
                                    <span className="inline-block rounded bg-zinc-100 px-1 py-0.5 font-mono text-[10px] uppercase text-zinc-700">
                                      {(a.languages && a.languages.length ? a.languages.join(",") : "—").slice(0, 14)}
                                    </span>
                                  </td>
                                  <td className="px-2 py-1.5 align-top font-mono text-[10px] leading-tight text-zinc-600">{a.adLibraryId}</td>
                                  <td className="px-1 py-1.5 align-top">
                                    <div className="flex flex-col gap-1">
                                      <button
                                        type="button"
                                        onClick={() => toggleAdPickRowExpanded(a.adLibraryId)}
                                        aria-expanded={expanded}
                                        className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-zinc-800 hover:bg-zinc-50"
                                      >
                                        {expanded ? "Hide" : "Expand"}
                                      </button>
                                      {a.mediaUrl ? (
                                        <a
                                          href={a.mediaUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-center text-[10px] font-medium text-violet-700 hover:underline"
                                        >
                                          Open creative
                                        </a>
                                      ) : null}
                                    </div>
                                  </td>
                                </tr>
                                {expanded ? (
                                  <tr className="bg-zinc-50">
                                    <td colSpan={9} className="px-4 py-4">
                                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                                        Full creative + copy
                                      </p>
                                      <div className="mx-auto max-w-lg rounded-xl border border-zinc-200 bg-white shadow-md">
                                        <div className="border-b border-zinc-100 px-4 py-2">
                                          <p className="text-sm font-semibold text-zinc-900">{a.pageName || "Advertiser"}</p>
                                          <p className="text-xs text-zinc-500">Sponsored · preview from Meta Ad Library</p>
                                        </div>
                                        <div className="bg-zinc-50 px-4 pb-4 pt-3">
                                          <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start sm:justify-center">
                                            <HarvestAdPreview mediaUrl={a.mediaUrl} compact={false} />
                                            <div className="min-w-0 flex-1 space-y-2 px-1">
                                              {a.bodyText ? (
                                                <p className="max-h-[min(40vh,320px)] overflow-y-auto whitespace-pre-wrap text-sm leading-snug text-zinc-900 [scrollbar-width:thin]">
                                                  {a.bodyText}
                                                </p>
                                              ) : (
                                                <p className="text-sm italic text-zinc-400">No primary text</p>
                                              )}
                                              {a.headline ? (
                                                <p className="text-sm font-semibold leading-snug text-zinc-900">{a.headline}</p>
                                              ) : null}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                ) : null}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">Market overview</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Looks across many advertisers at once: common promises, tones, offers, and ideas for how you could stand apart—in messaging
                or in campaign structure. If you selected specific ads under &ldquo;Pick specific ads,&rdquo; the overview uses those (and the
                collection you chose there); otherwise it follows the scope below.
              </p>
              <label className="mt-4 block text-xs font-medium text-zinc-500" htmlFor="overview-scope">
                Which ads should we include?
              </label>
              <select
                id="overview-scope"
                value={landscapeRunId}
                onChange={(e) => setLandscapeRunId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-violet-500/30 focus:border-violet-400 focus:ring-2"
              >
                <option value="">Everything collected in this account (most recent ads first)</option>
                {completedHarvestRuns.map((r) => (
                  <option key={r.id} value={r.id}>
                    {(r.label || "Collection").slice(0, 56)} · {r.adsStored || r._count?.ads || 0} ads ·{" "}
                    {new Date(r.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <label className="mt-3 block text-xs font-medium text-zinc-500" htmlFor="overview-topic">
                Short label for this overview (optional)
              </label>
              <input
                id="overview-topic"
                value={landscapeTopic}
                onChange={(e) => setLandscapeTopic(e.target.value)}
                placeholder="Example: Cryotherapy studios — Dallas area"
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none ring-violet-500/30 focus:border-violet-400 focus:ring-2"
              />
              <button
                type="button"
                disabled={landscapeBusy}
                onClick={() => void generateLandscape()}
                className="mt-4 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {landscapeBusy ? "Working…" : "Build market overview"}
              </button>
              {landscapePreview && !runInBackground && (
                <div className="mt-6 border-t border-zinc-100 pt-6">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Preview · {landscapePreview.adsUsed} ads in this summary
                    {typeof landscapePreview.adsExcluded === "number" && landscapePreview.adsExcluded > 0
                      ? ` · ${landscapePreview.adsExcluded} left out as off-topic`
                      : ""}
                  </p>
                  <div className="prose prose-sm prose-zinc mt-3 max-w-none">
                    {renderInsightSummaryText(landscapePreview.summary)}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">Focused advertiser summary</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Search the advertisers from your collections, tick the ones you care about, then request a concise competitive-style brief for
                just those brands. If you ticked specific ads under &ldquo;Pick specific ads,&rdquo; the next brief uses those ads instead of
                all ads from the selected Pages.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  value={brandQ}
                  onChange={(e) => setBrandQ(e.target.value)}
                  placeholder="Search by advertiser name"
                  className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none ring-violet-500/30 focus:border-violet-400 focus:ring-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void searchBrands();
                  }}
                />
                <button
                  type="button"
                  disabled={brandsLoading}
                  onClick={() => void searchBrands()}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {brandsLoading ? "Searching…" : "Search"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => void searchBrandsInternal("")}
                className="mt-2 text-sm text-violet-700 hover:underline"
              >
                Show popular advertisers from your collections
              </button>

              {brands.length > 0 && (
                <ul className="mt-4 max-h-64 space-y-1 overflow-y-auto rounded-xl border border-zinc-100 p-2">
                  {brands.map((b) => (
                    <li key={b.facebookPageId}>
                      <label className="flex cursor-pointer gap-3 rounded-lg px-2 py-2 hover:bg-zinc-50">
                        <input
                          type="checkbox"
                          checked={!!selectedPages[b.facebookPageId]}
                          onChange={() => togglePage(b.facebookPageId)}
                          className="mt-1 rounded border-zinc-300 text-violet-600"
                        />
                        <span className="min-w-0">
                          <span className="block font-medium text-zinc-900">{b.pageName || "Advertiser"}</span>
                          <span className="text-xs text-zinc-500">{b.adCount} ads in sample · ID {b.facebookPageId}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}

              <label className="mt-4 block text-xs font-medium text-zinc-500" htmlFor="brand-label">
                How should we refer to this group? (optional)
              </label>
              <input
                id="brand-label"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="Example: Top three local rivals"
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none ring-violet-500/30 focus:border-violet-400 focus:ring-2"
              />
              <button
                type="button"
                disabled={reportBusy}
                onClick={() => void generateReport()}
                className="mt-4 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {reportBusy ? "Working…" : "Build focused summary"}
              </button>

              {reportPreview && !runInBackground && (
                <div className="mt-6 border-t border-zinc-100 pt-6">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Preview · {reportPreview.adsUsed} ads in this summary
                    {typeof reportPreview.adsExcluded === "number" && reportPreview.adsExcluded > 0
                      ? ` · ${reportPreview.adsExcluded} left out as off-topic`
                      : ""}
                  </p>
                  <div className="prose prose-sm prose-zinc mt-3 max-w-none">
                    {renderInsightSummaryText(reportPreview.summary)}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {tab === "saved" && (
          <div className="mt-8 grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-zinc-900">Library</h2>
                  <button
                    type="button"
                    onClick={() => void loadInsights()}
                    className="text-sm text-violet-700 hover:underline"
                  >
                    Refresh
                  </button>
                </div>
                {insightsLoading ? (
                  <p className="mt-4 text-sm text-zinc-500">Loading…</p>
                ) : insights.length === 0 ? (
                  <p className="mt-4 text-sm text-zinc-600">
                    No saved summaries yet. Build one under Summaries—they are stored here automatically.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-1">
                    {insights.map((row) => (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedInsightId(row.id)}
                          className={
                            selectedInsightId === row.id
                              ? "w-full rounded-xl border border-violet-300 bg-violet-50 px-3 py-3 text-left text-sm"
                              : "w-full rounded-xl border border-transparent px-3 py-3 text-left text-sm hover:bg-zinc-50"
                          }
                        >
                          <span className="block font-medium text-zinc-900">
                            {row.title || (row.kind === "landscape" ? "Market overview" : "Advertiser summary")}
                          </span>
                          <span className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-zinc-500">
                            <span className="capitalize">{row.kind}</span>
                            <span>·</span>
                            <span>{new Date(row.createdAt).toLocaleString()}</span>
                            <span>·</span>
                            <span className="capitalize">{row.status}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
            <div className="lg:col-span-3">
              <section className="min-h-[280px] rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                {!selectedInsight ? (
                  <p className="text-sm text-zinc-600">Choose a report on the left to read it here.</p>
                ) : selectedInsight.status === "pending" ? (
                  <div className="text-sm text-zinc-700">
                    <p className="font-medium text-zinc-900">Still generating…</p>
                    <p className="mt-2 text-zinc-600">
                      This can take a minute or two for large collections. Use Refresh if the list does not update.
                    </p>
                  </div>
                ) : selectedInsight.status === "failed" ? (
                  <div className="text-sm text-red-900">
                    <p className="font-medium">Something went wrong</p>
                    <p className="mt-2">{selectedInsight.errorMessage || "Please try building the summary again."}</p>
                  </div>
                ) : selectedInsight.report ? (
                  <>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      {selectedInsight.report.adsUsed} ads in this summary
                      {typeof selectedInsight.report.adsExcluded === "number" && selectedInsight.report.adsExcluded > 0
                        ? ` · ${selectedInsight.report.adsExcluded} left out as off-topic`
                        : ""}
                    </p>
                    <div className="prose prose-sm prose-zinc mt-4 max-w-none">
                      {renderInsightSummaryText(selectedInsight.report.summary)}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-zinc-600">This entry has no readable body yet.</p>
                )}
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function HarvestPage() {
  return (
    <ExpansionProductGate productKey="competitors">
      <HarvestInner />
    </ExpansionProductGate>
  );
}
