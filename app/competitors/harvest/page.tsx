"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppNav from "@/components/AppNav";
import { CompetitorsSectionNav } from "@/components/CompetitorsSectionNav";
import { ExpansionProductGate } from "@/components/ExpansionProductGate";
import { HarvestReportBriefBody } from "@/components/HarvestReportBrief";
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
import { fetchHarvestSnapshotPreview, HARVEST_THUMB_PRELOAD_FIRST } from "@/lib/harvestSnapshotThumbQueue";
import { userFacingError } from "@/lib/userFacingError";

type HarvestTab = "collect" | "reports" | "saved";

const BRAND_AD_PICK_CAP = 48;
const LANDSCAPE_AD_PICK_CAP = 80;

function harvestDiagnosticsLines(d: unknown): string[] {
  if (!Array.isArray(d)) return [];
  return d.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim());
}

function isQueuedHarvestResponse(
  x: MetaHarvestReportSyncResponse | MetaHarvestReportQueuedResponse
): x is MetaHarvestReportQueuedResponse {
  return "backgroundAccepted" in x && x.backgroundAccepted === true;
}

function isMetaAdLibrarySnapshotUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^www\./i, "").toLowerCase();
    return (
      (h === "facebook.com" ||
        h === "m.facebook.com" ||
        h === "lm.facebook.com" ||
        h === "l.facebook.com") &&
      (u.pathname.includes("/ads/") || u.pathname.includes("render_ad") || h === "l.facebook.com")
    );
  } catch {
    return false;
  }
}

/** Meta snapshot pages block embedded iframes; load og:image via backend (crawler UA). */
function HarvestAdPreview({
  mediaUrl,
  thumbPriority = 0,
  intersectionRoot,
}: {
  mediaUrl: string | null;
  /** Lower = fetched sooner (grid row index). */
  thumbPriority?: number;
  /** Scroll container for lazy thumbnails; cards beyond the first batch wait until scrolled near. */
  intersectionRoot?: HTMLDivElement | null;
}) {
  const observeTargetRef = useRef<HTMLDivElement | null>(null);
  const eager = thumbPriority < HARVEST_THUMB_PRELOAD_FIRST;
  const [inView, setInView] = useState(eager);

  useEffect(() => {
    if (thumbPriority < HARVEST_THUMB_PRELOAD_FIRST) {
      setInView(true);
      return;
    }
    setInView(false);
    const el = observeTargetRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { root: intersectionRoot ?? undefined, rootMargin: "320px", threshold: 0.02 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [thumbPriority, mediaUrl, intersectionRoot]);

  const [thumb, setThumb] = useState<string | null>(null);
  const [snapshotEmbedHtml, setSnapshotEmbedHtml] = useState<string | null>(null);
  const [thumbError, setThumbError] = useState(false);
  const [thumbLoading, setThumbLoading] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  /** Retry Meta CDN `<img>` with different referrer policies before falling back to iframe embed. */
  const [remoteThumbReferrer, setRemoteThumbReferrer] = useState<"" | "no-referrer" | "origin">("");

  const previewHtmlRef = useRef<string | null>(null);

  useEffect(() => {
    setThumb(null);
    setSnapshotEmbedHtml(null);
    previewHtmlRef.current = null;
    setThumbError(false);
    setThumbLoading(false);
    setImgFailed(false);
    setRemoteThumbReferrer("");
    if (!mediaUrl || !isMetaAdLibrarySnapshotUrl(mediaUrl)) return;
    if (!inView) return;
    let cancelled = false;
    setThumbLoading(true);
    void fetchHarvestSnapshotPreview(mediaUrl, thumbPriority)
      .then((r) => {
        if (cancelled) return;
        const ph = r.previewHtml ?? null;
        previewHtmlRef.current = ph;
        setSnapshotEmbedHtml(ph);
        if (r.thumbnailDataUrl) {
          setThumb(r.thumbnailDataUrl);
          return;
        }
        /* Meta CDN URLs often “load” in <img> without onError but paint nothing — prefer iframe HTML when available. */
        if (ph) {
          setThumb(null);
          return;
        }
        if (r.thumbnailUrl) {
          setThumb(r.thumbnailUrl);
          return;
        }
        setThumbError(true);
      })
      .catch(() => {
        if (!cancelled) setThumbError(true);
      })
      .finally(() => {
        if (!cancelled) setThumbLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mediaUrl, inView, thumbPriority]);

  const wrap = "relative h-[136px] w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100";

  if (!mediaUrl) {
    return (
      <div className={`${wrap} flex items-center justify-center bg-zinc-50 px-2 text-center text-[10px] leading-snug text-zinc-500`}>
        No creative URL stored
      </div>
    );
  }

  if (thumb) {
    const isRemoteHttpsThumb = /^https:\/\//i.test(thumb);
    const handleImgSoftFail = () => {
      if (isRemoteHttpsThumb && remoteThumbReferrer === "") setRemoteThumbReferrer("no-referrer");
      else if (isRemoteHttpsThumb && remoteThumbReferrer === "no-referrer") setRemoteThumbReferrer("origin");
      else if (previewHtmlRef.current) setThumb(null);
      else {
        setThumb(null);
        setThumbError(true);
      }
    };
    return (
      <div className={wrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={isRemoteHttpsThumb ? `${thumb}:${remoteThumbReferrer}` : thumb}
          src={thumb}
          alt=""
          className="h-full w-full object-cover bg-zinc-200"
          referrerPolicy={isRemoteHttpsThumb && remoteThumbReferrer ? remoteThumbReferrer : undefined}
          onLoad={(e) => {
            const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
            if (w === 0 || h === 0 || (w <= 16 && h <= 16)) handleImgSoftFail();
          }}
          onError={handleImgSoftFail}
        />
        <a
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-0 left-0 right-0 truncate bg-white/95 py-1 text-center text-[10px] font-semibold text-violet-700 hover:bg-white"
        >
          Open on Meta ↗
        </a>
      </div>
    );
  }

  const embedWrap =
    "relative min-h-[220px] h-[220px] w-full overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-inner";

  if (snapshotEmbedHtml) {
    return (
      <div className={embedWrap}>
        <iframe
          title="Meta ad preview"
          srcDoc={snapshotEmbedHtml}
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          className="h-full w-full border-0 bg-white"
        />
        <a
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-0 left-0 right-0 truncate bg-white/95 py-1 text-center text-[10px] font-semibold text-violet-700 hover:bg-white"
        >
          Open on Meta ↗
        </a>
      </div>
    );
  }

  if (isMetaAdLibrarySnapshotUrl(mediaUrl)) {
    if (!inView) {
      return (
        <div
          ref={observeTargetRef}
          className={`${wrap} flex flex-col items-center justify-center gap-1 bg-zinc-100 px-2 text-center`}
        >
          <span className="text-[10px] text-zinc-600">Preview loads when scrolled into view</span>
          <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-violet-700 hover:underline">
            Open on Meta ↗
          </a>
        </div>
      );
    }
    return (
      <div ref={observeTargetRef} className={`${wrap} flex flex-col items-center justify-center gap-1 bg-zinc-200 px-2 text-center`}>
        {thumbLoading ? <span className="text-[10px] text-zinc-600">Loading thumbnail…</span> : null}
        {!thumbLoading && thumbError ? <span className="text-[10px] text-zinc-600">Thumbnail unavailable</span> : null}
        <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-violet-700 hover:underline">
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
        className={`${wrap} flex flex-col items-center justify-center gap-1 bg-gradient-to-b from-zinc-700 to-zinc-900 text-[10px] font-medium text-white hover:opacity-95`}
      >
        <span aria-hidden>▶</span>
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
        className={`${wrap} flex items-center justify-center bg-zinc-100 px-2 text-center text-[10px] font-medium text-violet-700`}
      >
        Open creative
      </a>
    );
  }

  return (
    <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className={`${wrap} block`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
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
  const [collectIntentPrompt, setCollectIntentPrompt] = useState("");
  const [collectionKwSuggestBusy, setCollectionKwSuggestBusy] = useState(false);
  const [collectionKwRationale, setCollectionKwRationale] = useState<string | null>(null);
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
  /** Default on: landscape/report OpenAI work often exceeds hosted proxy limits (e.g. Vercel) if we wait synchronously. */
  const [runInBackground, setRunInBackground] = useState(true);

  const [landscapeRunId, setLandscapeRunId] = useState("");
  const [landscapeTopic, setLandscapeTopic] = useState("");
  const [landscapeBusy, setLandscapeBusy] = useState(false);
  const [landscapePreview, setLandscapePreview] = useState<MetaHarvestReportPayload | null>(null);

  const [adPickRunId, setAdPickRunId] = useState("");
  const [adPickRows, setAdPickRows] = useState<MetaAdHarvestAdRow[]>([]);
  const [adPickLoading, setAdPickLoading] = useState(false);
  const [selectedAdLibraryIds, setSelectedAdLibraryIds] = useState<Record<string, boolean>>({});

  /** Scroll root for lazy-loading creative thumbnails (IntersectionObserver). */
  const [thumbScrollRoot, setThumbScrollRoot] = useState<HTMLDivElement | null>(null);

  const [insights, setInsights] = useState<MetaHarvestInsightRow[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);

  const [pickIntentPrompt, setPickIntentPrompt] = useState("");
  const [pickRankingKwInput, setPickRankingKwInput] = useState("");
  const [rankingSaveBusy, setRankingSaveBusy] = useState(false);
  const [rankingSuggestBusy, setRankingSuggestBusy] = useState(false);

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
    setCollectionKwRationale(null);
  }, [collectIntentPrompt]);

  useEffect(() => {
    if (user && tab === "saved") void loadInsights();
  }, [user, tab, loadInsights]);

  const hasPendingInsights = useMemo(() => insights.some((i) => i.status === "pending"), [insights]);

  const completedHarvestRuns = useMemo(
    () => runs.filter((r) => r.status === "completed" && (r.adsStored > 0 || (r._count?.ads ?? 0) > 0)),
    [runs]
  );

  useEffect(() => {
    setSelectedAdLibraryIds({});
    setPickIntentPrompt("");
    setPickRankingKwInput("");
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
        if (!cancelled) {
          setAdPickRows(run.ads ?? []);
          setPickIntentPrompt(typeof run.intentPrompt === "string" ? run.intentPrompt : "");
          const rk = Array.isArray(run.rankingKeywords)
            ? (run.rankingKeywords as unknown[]).filter((x): x is string => typeof x === "string").map((x) => x.trim())
            : [];
          setPickRankingKwInput(rk.join(", "));
        }
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

  async function saveHarvestRankingContext() {
    if (!adPickRunId.trim()) return;
    setRankingSaveBusy(true);
    setError(null);
    setInfo(null);
    try {
      const phrases = pickRankingKwInput
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1)
        .slice(0, 36);
      await expansion.competitor.updateMetaHarvestRunRankingContext(adPickRunId.trim(), {
        intentPrompt: pickIntentPrompt.trim() || null,
        rankingKeywords: phrases,
      });
      const { run } = await expansion.competitor.getMetaHarvestRun(adPickRunId.trim());
      setAdPickRows(run.ads ?? []);
      setInfo("Ranking settings saved — ads are re-sorted below.");
    } catch (e) {
      setError(userFacingError(e));
    } finally {
      setRankingSaveBusy(false);
    }
  }

  async function suggestHarvestRankingKeywords() {
    if (!adPickRunId.trim()) return;
    setRankingSuggestBusy(true);
    setError(null);
    setInfo(null);
    try {
      const { keywords } = await expansion.competitor.suggestMetaHarvestRankingKeywords(adPickRunId.trim(), {
        intentPrompt: pickIntentPrompt.trim() || undefined,
      });
      if (keywords.length) setPickRankingKwInput(keywords.join(", "));
      else setInfo("No AI phrases returned — write intent above or confirm OPENAI_API_KEY on your API server.");
    } catch (e) {
      setError(userFacingError(e));
    } finally {
      setRankingSuggestBusy(false);
    }
  }

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

  async function suggestCollectionKeywordsFromGoal() {
    const intent = collectIntentPrompt.trim();
    if (intent.length < 16) {
      setError("Describe what ads you want in at least a sentence (~16+ characters), then ask AI for keywords.");
      setInfo(null);
      return;
    }
    setCollectionKwSuggestBusy(true);
    setError(null);
    setInfo(null);
    setCollectionKwRationale(null);
    try {
      const { keywords, rationale } = await expansion.competitor.suggestMetaHarvestCollectionKeywords({
        intentPrompt: intent,
      });
      if (keywords.length) setKwInput(keywords.join(", "));
      setCollectionKwRationale(rationale.trim() ? rationale.trim() : null);
      if (keywords.length) {
        setInfo("Suggestion applied — edit the keyword box if needed, then collect.");
      } else {
        setError("AI returned no keywords. Check OPENAI_API_KEY on your API server or try a richer description.");
      }
    } catch (e) {
      setError(userFacingError(e));
    } finally {
      setCollectionKwSuggestBusy(false);
    }
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
      const { run } = await expansion.competitor.createMetaHarvestRun({
        keywords,
        label: label.trim() || undefined,
        intentPrompt: collectIntentPrompt.trim() || undefined,
      });
      const adsCount = Math.max(run.adsStored ?? 0, run._count?.ads ?? 0);
      const diagLines = harvestDiagnosticsLines(run.diagnostics);

      if (run.status === "failed") {
        setInfo(null);
        setError([run.errorMessage, diagLines.join(" ")].filter(Boolean).join(" — ") || "Collection failed.");
      } else if (adsCount === 0) {
        setInfo(null);
        const hint =
          diagLines.length > 0
            ? diagLines.join(" ")
            : "No diagnostic lines returned — on the API host confirm META_AD_LIBRARY_TOKEN or META_APP_ID+META_APP_SECRET, clear META_AD_LIBRARY_CONTENT_LANGUAGES if set, or set META_HARVEST_STRICT_KEYWORD_MATCH=false to test.";
        setError(
          `No ads were saved. ${hint} If you use META_AD_LIBRARY_TOKEN (a user long-lived token), it often expires after ~60 days — generate a new one in Meta and update your server env.`
        );
      } else {
        setError(null);
        setInfo("Collection finished. New ads are ready to browse and report on.");
      }
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
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 pb-16">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <CompetitorsSectionNav />
          <Link href="/" className="shrink-0 text-sm text-zinc-600 hover:text-zinc-900 hover:underline">
            Home
          </Link>
        </div>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-zinc-900">Ads Library research</h1>
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
              <label className="mt-4 block text-xs font-medium text-zinc-500" htmlFor="harvest-intent">
                What are you trying to find? (optional — saves with this collection)
              </label>
              <textarea
                id="harvest-intent"
                value={collectIntentPrompt}
                onChange={(e) => setCollectIntentPrompt(e.target.value)}
                rows={3}
                placeholder="Example: Active ads from boutique cryotherapy studios and cold plunge brands targeting wellness shoppers in Texas—not generic gym chains."
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none ring-violet-500/30 focus:border-violet-400 focus:ring-2"
              />
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                AI can turn this into Meta search keywords below. Each successful collection updates a workspace vocabulary so suggestions improve as you pull more ads.
              </p>
              <button
                type="button"
                disabled={collectionKwSuggestBusy || harvestBusy}
                onClick={() => void suggestCollectionKeywordsFromGoal()}
                className="mt-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-900 hover:bg-violet-100 disabled:opacity-50"
              >
                {collectionKwSuggestBusy ? "Suggesting…" : "Suggest keywords from description"}
              </button>
              {collectionKwRationale ? (
                <div className="mt-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-700">
                  <span className="font-semibold text-zinc-800">Why these terms: </span>
                  {collectionKwRationale}
                </div>
              ) : null}
              <label className="mt-6 block text-xs font-medium text-zinc-500" htmlFor="harvest-keywords">
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
                    <li key={r.id} className="border-b border-zinc-100 py-3 text-sm last:border-b-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                          <span className="font-medium text-zinc-900">{r.label || "Collection"}</span>
                          <span className="text-zinc-500"> · </span>
                          <span className="capitalize text-zinc-600">{r.status}</span>
                        </div>
                        <span className="text-zinc-500">
                          {r.adsStored || r._count?.ads || 0} ads · {new Date(r.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {(r.adsStored || r._count?.ads || 0) === 0 ? (
                        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-950">
                          {r.errorMessage ? <p className="font-medium text-amber-950">{r.errorMessage}</p> : null}
                          {harvestDiagnosticsLines(r.diagnostics).length ? (
                            <ul className="mt-1 list-disc space-y-0.5 pl-4">
                              {harvestDiagnosticsLines(r.diagnostics).slice(0, 10).map((line, idx) => (
                                <li key={idx}>{line}</li>
                              ))}
                            </ul>
                          ) : !r.errorMessage ? (
                            <p className="text-amber-900/90">
                              No detailed diagnostics — if this happens again, check Meta env on the API server (token, languages filter, strict
                              keyword match).
                            </p>
                          ) : null}
                        </div>
                      ) : null}
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
                    Recommended. Market overview and advertiser reports call the model for a while; waiting in the browser often hits a
                    gateway timeout. Off: you get an on-page preview when it finishes, if your hosting allows long requests.
                  </span>
                </span>
              </label>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">Pick specific ads (optional)</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Ads sort by <strong>relevance score</strong> (collection keywords + phrases/intent below + soft boosts from advertisers you&apos;ve picked before on normal accounts). Cards lay out <strong>four per row</strong> on wide screens (fewer on tablets/phones)—scroll inside the bordered panel to skim many ads quickly. Creative previews load through our API (max four at a time, top ads first): we extract image URLs from Meta’s snapshot HTML when we can; otherwise we embed a sanitized snapshot (scripts removed) when the HTML already includes images or video tags—cards farther down fetch when you scroll near them so the grid stays responsive.{" "}
                <strong>New collections</strong> keep ads whose copy/Page name mentions your keywords; random listings like unrelated music merch should disappear unless your backend sets{" "}
                <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs">META_HARVEST_STRICT_KEYWORD_MATCH=false</code>. Optional{" "}
                <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs">META_AD_LIBRARY_CONTENT_LANGUAGES=en</code> narrows Meta&apos;s search by language.
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
                  <div className="mb-4 rounded-xl border border-violet-100 bg-violet-50/50 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-900">Ranking & intent</p>
                    <p className="mt-1 text-xs leading-snug text-zinc-600">
                      Tell the system what you care about in this collection. Save extra phrases here or generate them from your intent with AI.
                      Intent text is logged for this workspace (skipped for API admin emails in{" "}
                      <code className="rounded bg-white px-1 py-0.5 font-mono text-[10px]">ADMIN_EMAILS</code>) and helps sort ads plus steer future summary prompts.
                    </p>
                    <label className="mt-3 block text-xs font-medium text-zinc-500" htmlFor="pick-intent">
                      What ads do you want at the top?
                    </label>
                    <textarea
                      id="pick-intent"
                      value={pickIntentPrompt}
                      onChange={(e) => setPickIntentPrompt(e.target.value)}
                      rows={2}
                      placeholder="Example: wellness studios promoting cryotherapy packages to women 35–55 in Texas—not generic gyms."
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-violet-500/30 focus:border-violet-400 focus:ring-2"
                    />
                    <label className="mt-3 block text-xs font-medium text-zinc-500" htmlFor="pick-ranking-kw">
                      Extra ranking phrases (comma-separated, saved with this collection)
                    </label>
                    <textarea
                      id="pick-ranking-kw"
                      value={pickRankingKwInput}
                      onChange={(e) => setPickRankingKwInput(e.target.value)}
                      rows={2}
                      placeholder="cryotherapy package, body contouring, localized fat loss"
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-violet-500/30 focus:border-violet-400 focus:ring-2"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={rankingSuggestBusy || !adPickRunId.trim()}
                        onClick={() => void suggestHarvestRankingKeywords()}
                        className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-sm font-medium text-violet-900 hover:bg-violet-50 disabled:opacity-50"
                      >
                        {rankingSuggestBusy ? "Suggesting…" : "Suggest phrases from intent"}
                      </button>
                      <button
                        type="button"
                        disabled={rankingSaveBusy || !adPickRunId.trim()}
                        onClick={() => void saveHarvestRankingContext()}
                        className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                      >
                        {rankingSaveBusy ? "Saving…" : "Save ranking settings"}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const next: Record<string, boolean> = {};
                        for (const a of adPickRows) next[a.adLibraryId] = true;
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
                    {adPickRows.length} ads · {pickedAdLibraryIds().length} selected · up to {BRAND_AD_PICK_CAP} for focused summary · up to{" "}
                    {LANDSCAPE_AD_PICK_CAP} for market overview
                  </p>
                  <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 shadow-sm">
                    <div ref={setThumbScrollRoot} className="max-h-[min(88vh,960px)] overflow-y-auto pr-1">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {adPickRows.map((a, idx) => {
                          const pickId = `ad-pick-${a.adLibraryId}`;
                          return (
                            <article
                              key={a.id}
                              className="flex flex-col rounded-xl border border-zinc-200 bg-white p-3 shadow-sm ring-offset-2 hover:ring-2 hover:ring-violet-200"
                            >
                              <div className="mb-2 flex items-start justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[11px] font-medium text-zinc-400">#{idx + 1}</span>
                                  {typeof a.relevanceScore === "number" ? (
                                    <span
                                      className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800"
                                      title="Relevance score (higher = closer match to keywords, intent, and your past picks)"
                                    >
                                      {Math.round(a.relevanceScore)}
                                    </span>
                                  ) : null}
                                </div>
                                <input
                                  id={pickId}
                                  type="checkbox"
                                  checked={!!selectedAdLibraryIds[a.adLibraryId]}
                                  onChange={() => toggleAdLibraryPick(a.adLibraryId)}
                                  aria-label={`Include ad ${idx + 1} from ${a.pageName || "advertiser"} in summary`}
                                  className="mt-0.5 rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
                                />
                              </div>
                              <HarvestAdPreview mediaUrl={a.mediaUrl} thumbPriority={idx} intersectionRoot={thumbScrollRoot} />
                              <label htmlFor={pickId} className="mt-2 cursor-pointer">
                                <span className="text-[11px] font-semibold leading-tight text-zinc-900">{a.pageName || "Advertiser"}</span>
                                <span className="mt-0.5 block truncate font-mono text-[10px] text-zinc-500">{a.facebookPageId}</span>
                              </label>
                              <div className="mt-2 min-h-[3rem] max-h-[4.5rem] overflow-y-auto text-[11px] leading-snug text-zinc-700 [scrollbar-width:thin]">
                                {a.bodyText ? (
                                  <label htmlFor={pickId} className="cursor-pointer whitespace-pre-wrap break-words">
                                    {a.bodyText}
                                  </label>
                                ) : (
                                  <span className="italic text-zinc-400">No primary text</span>
                                )}
                              </div>
                              <p className="mt-2 line-clamp-3 text-[11px] font-semibold text-zinc-900">{a.headline || "—"}</p>
                              <p className="mt-2 truncate font-mono text-[10px] text-zinc-500">ID {a.adLibraryId}</p>
                              {a.mediaUrl ? (
                                <a
                                  href={a.mediaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 text-center text-[11px] font-medium text-violet-700 hover:underline"
                                >
                                  Open on Meta ↗
                                </a>
                              ) : null}
                            </article>
                          );
                        })}
                      </div>
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
                  <div className="mt-3 max-w-none">
                    <HarvestReportBriefBody
                      report={landscapePreview}
                      campaignNamePrefix={landscapePreview.competitorDisplayName || landscapeTopic || "Market overview"}
                    />
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
                  <div className="mt-3 max-w-none">
                    <HarvestReportBriefBody
                      report={reportPreview}
                      campaignNamePrefix={reportPreview.competitorDisplayName || reportName || "Focused advertisers"}
                    />
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
                    <div className="mt-4 max-w-none">
                      <HarvestReportBriefBody
                        report={selectedInsight.report}
                        campaignNamePrefix={
                          selectedInsight.report.competitorDisplayName || selectedInsight.title || "Saved report"
                        }
                      />
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
