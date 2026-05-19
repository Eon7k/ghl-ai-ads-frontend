"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppNav from "@/components/AppNav";
import LandingPageDesignCanvas from "@/components/LandingPageDesignCanvas";
import LandingPageEditorInspector, {
  type LandingEditorZone,
} from "@/components/LandingPageEditorInspector";
import { ExpansionProductGate } from "@/components/ExpansionProductGate";
import { useAuth } from "@/contexts/AuthContext";
import {
  api,
  expansion,
  type LandingFunnelStep,
  type LandingGalleryImage,
  type LandingNavLinkRow,
  type LandingPageData,
  type LandingPageRecord,
  type LandingPageTheme,
  type LandingStepButton,
} from "@/lib/api";
import type { Experiment } from "@/lib/types";

const LANDING_DNS_CNAME_TARGET = (
  typeof process.env.NEXT_PUBLIC_LANDING_DNS_CNAME_TARGET === "string" ? process.env.NEXT_PUBLIC_LANDING_DNS_CNAME_TARGET : ""
).trim();

const LANDING_PUBLIC_URL_TEMPLATE = (
  typeof process.env.NEXT_PUBLIC_LANDING_PUBLIC_URL_TEMPLATE === "string"
    ? process.env.NEXT_PUBLIC_LANDING_PUBLIC_URL_TEMPLATE
    : ""
).trim();

function interpolateLandingUrlTemplate(
  template: string,
  ctx: { id: string; slug: string; subdomain: string },
): string {
  return template.replace(/\{id\}/g, ctx.id).replace(/\{slug\}/g, ctx.slug).replace(/\{subdomain\}/g, ctx.subdomain || "");
}

function parseNavLinks(raw: unknown): LandingNavLinkRow[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const rows: LandingNavLinkRow[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const r = x as Record<string, unknown>;
    const label = typeof r.label === "string" ? r.label : "";
    const href = typeof r.href === "string" ? r.href : "";
    if (!label.trim() && !href.trim()) continue;
    const row: LandingNavLinkRow = { label, href };
    if (r.newTab === true) row.newTab = true;
    rows.push(row);
  }
  return rows.length ? rows : undefined;
}

function parseGalleryImages(raw: unknown): LandingGalleryImage[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const rows: LandingGalleryImage[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const g = x as Record<string, unknown>;
    const url = typeof g.url === "string" ? g.url : "";
    if (!url.trim()) continue;
    const row: LandingGalleryImage = { url };
    if (typeof g.alt === "string" && g.alt.trim()) row.alt = g.alt;
    if (typeof g.caption === "string" && g.caption.trim()) row.caption = g.caption;
    rows.push(row);
  }
  return rows.length ? rows : undefined;
}

function parseLandingStepButtons(raw: unknown): LandingStepButton[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const rows: LandingStepButton[] = [];
  for (const x of raw.slice(0, 8)) {
    if (!x || typeof x !== "object") continue;
    const r = x as Record<string, unknown>;
    const labelRaw =
      typeof r.label === "string" ? r.label : typeof r.text === "string" ? String(r.text) : "";
    const hrefRaw =
      typeof r.href === "string"
        ? r.href
        : typeof r.url === "string"
          ? r.url
          : typeof r.link === "string"
            ? String(r.link)
            : "";
    const label = labelRaw.trim().slice(0, 140);
    const href = hrefRaw.trim().slice(0, 2048);
    if (!href && !label) continue;
    const row: LandingStepButton = { label: label || "Button", href: href || "/" };
    if (r.newTab === true || r.openNewTab === true) row.newTab = true;
    const vr = typeof r.variant === "string" ? r.variant.trim().toLowerCase() : "";
    const sr = typeof r.style === "string" ? r.style.trim().toLowerCase() : "";
    const cand = vr || sr;
    if (cand.includes("outline")) row.variant = "outline";
    else if (cand.includes("ghost") || cand.includes("link") || cand.includes("text"))
      row.variant = "ghost";
    rows.push(row);
  }
  return rows.length ? rows : undefined;
}

function safeThemeEmbedMaxWidth(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const s = raw.trim().slice(0, 48);
  if (!s) return undefined;
  if (/[<>'"`]|url\(|expression|javascript|\\0/i.test(s)) return undefined;
  return s;
}

function normalizeTheme(raw: unknown): LandingPageTheme | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const t = raw as Record<string, unknown>;
  const corner =
    t.cornerRadius === "rounded" || t.cornerRadius === "square" || t.cornerRadius === "pill" ? t.cornerRadius : undefined;
  const embedCardRadius =
    t.formEmbedCardRadius === "rounded" || t.formEmbedCardRadius === "square" || t.formEmbedCardRadius === "pill"
      ? t.formEmbedCardRadius
      : undefined;
  const out: LandingPageTheme = {};
  if (typeof t.preset === "string") out.preset = t.preset;
  if (typeof t.primaryHex === "string") out.primaryHex = t.primaryHex;
  if (typeof t.accentHex === "string") out.accentHex = t.accentHex;
  if (typeof t.heroBgImageUrl === "string") out.heroBgImageUrl = t.heroBgImageUrl;
  if (corner) out.cornerRadius = corner;
  if (typeof t.headingFontPreset === "string") out.headingFontPreset = t.headingFontPreset;
  if (typeof t.bodyFontPreset === "string") out.bodyFontPreset = t.bodyFontPreset;
  if (typeof t.headingFontCss === "string") out.headingFontCss = t.headingFontCss;
  if (typeof t.bodyFontCss === "string") out.bodyFontCss = t.bodyFontCss;

  if (typeof t.heroOverlayOpacity === "number" && Number.isFinite(t.heroOverlayOpacity)) {
    out.heroOverlayOpacity = Math.min(0.95, Math.max(0, t.heroOverlayOpacity));
  }

  const belowBackdrop =
    t.belowHeroBackdrop === "matchHero" || t.belowHeroBackdrop === "isolateHero" ? t.belowHeroBackdrop : undefined;
  if (belowBackdrop) out.belowHeroBackdrop = belowBackdrop;

  const ew = safeThemeEmbedMaxWidth(t.formEmbedMaxWidth);
  if (ew) out.formEmbedMaxWidth = ew;

  if (typeof t.formEmbedIframeMinHeightPx === "number" && Number.isFinite(t.formEmbedIframeMinHeightPx)) {
    out.formEmbedIframeMinHeightPx = Math.min(960, Math.max(120, Math.round(t.formEmbedIframeMinHeightPx)));
  }
  if (typeof t.formEmbedIframeMaxHeightPx === "number" && Number.isFinite(t.formEmbedIframeMaxHeightPx)) {
    out.formEmbedIframeMaxHeightPx = Math.min(1200, Math.max(200, Math.round(t.formEmbedIframeMaxHeightPx)));
  }
  if (typeof t.formEmbedOuterPaddingPx === "number" && Number.isFinite(t.formEmbedOuterPaddingPx)) {
    out.formEmbedOuterPaddingPx = Math.min(96, Math.max(0, Math.round(t.formEmbedOuterPaddingPx)));
  }
  if (typeof t.formEmbedCardBgHex === "string") out.formEmbedCardBgHex = t.formEmbedCardBgHex;
  if (typeof t.formEmbedCardBorderHex === "string") out.formEmbedCardBorderHex = t.formEmbedCardBorderHex;
  if (embedCardRadius) out.formEmbedCardRadius = embedCardRadius;

  if (typeof t.contentColumnMaxWidthPx === "number" && Number.isFinite(t.contentColumnMaxWidthPx)) {
    out.contentColumnMaxWidthPx = Math.min(1200, Math.max(300, Math.round(t.contentColumnMaxWidthPx)));
  }
  if (typeof t.heroPaddingYPx === "number" && Number.isFinite(t.heroPaddingYPx)) {
    out.heroPaddingYPx = Math.min(240, Math.max(32, Math.round(t.heroPaddingYPx)));
  }
  if (typeof t.funnelSectionPaddingYPx === "number" && Number.isFinite(t.funnelSectionPaddingYPx)) {
    out.funnelSectionPaddingYPx = Math.min(160, Math.max(16, Math.round(t.funnelSectionPaddingYPx)));
  }
  if (typeof t.galleryCardImageHeightPx === "number" && Number.isFinite(t.galleryCardImageHeightPx)) {
    out.galleryCardImageHeightPx = Math.min(420, Math.max(72, Math.round(t.galleryCardImageHeightPx)));
  }
  if (typeof t.faqSectionPaddingYPx === "number" && Number.isFinite(t.faqSectionPaddingYPx)) {
    out.faqSectionPaddingYPx = Math.min(200, Math.max(24, Math.round(t.faqSectionPaddingYPx)));
  }
  if (typeof t.previewRootFontSizePx === "number" && Number.isFinite(t.previewRootFontSizePx)) {
    out.previewRootFontSizePx = Math.min(23, Math.max(12, Math.round(t.previewRootFontSizePx)));
  }

  return Object.keys(out).length ? out : undefined;
}

function normalizePageData(raw: unknown): LandingPageData {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;

  let funnelSteps: LandingFunnelStep[] | undefined;
  if (Array.isArray(o.funnelSteps)) {
    funnelSteps = o.funnelSteps
      .filter((x) => x && typeof x === "object")
      .map((x) => {
        const s = x as Record<string, unknown>;
        let bullets: string[] | undefined;
        if (Array.isArray(s.bullets)) {
          bullets = s.bullets.filter((b) => typeof b === "string").map((b) => String(b));
          if (bullets.length === 0) bullets = undefined;
        }
        const stepOut: LandingFunnelStep = {
          key: typeof s.key === "string" ? s.key : "",
          title: typeof s.title === "string" ? s.title : "",
          body: typeof s.body === "string" ? s.body : "",
          bullets,
        };
        const blockBtns =
          parseLandingStepButtons(s.buttons) ?? parseLandingStepButtons(s.ctas);
        if (blockBtns?.length) stepOut.buttons = blockBtns;
        return stepOut;
      });
    if (funnelSteps.length === 0) funnelSteps = undefined;
  }

  let faq: { q: string; a: string }[] | undefined;
  if (Array.isArray(o.faq)) {
    faq = o.faq
      .filter((x) => x && typeof x === "object")
      .map((x) => {
        const f = x as Record<string, unknown>;
        return {
          q: typeof f.q === "string" ? f.q : "",
          a: typeof f.a === "string" ? f.a : "",
        };
      })
      .filter((x) => x.q || x.a);
    if (faq.length === 0) faq = undefined;
  }

  let trustSignals: string[] | undefined;
  if (Array.isArray(o.trustSignals)) {
    trustSignals = o.trustSignals
      .filter((x) => typeof x === "string")
      .map((x) => String(x))
      .filter(Boolean);
    if (trustSignals.length === 0) trustSignals = undefined;
  }

  return {
    headline: typeof o.headline === "string" ? o.headline : "",
    subheadline: typeof o.subheadline === "string" ? o.subheadline : "",
    body: typeof o.body === "string" ? o.body : "",
    ctaText: typeof o.ctaText === "string" ? o.ctaText : "",
    ctaUrl: typeof o.ctaUrl === "string" ? o.ctaUrl : "",
    formEmbedHtml: typeof o.formEmbedHtml === "string" ? o.formEmbedHtml : "",
    funnelSteps,
    faq,
    trustSignals,
    thankYouCopy: typeof o.thankYouCopy === "string" ? o.thankYouCopy : "",
    seoTitle: typeof o.seoTitle === "string" ? o.seoTitle : "",
    seoDescription: typeof o.seoDescription === "string" ? o.seoDescription : "",
    formPlacementNote: typeof o.formPlacementNote === "string" ? o.formPlacementNote : "",
    adGoalEcho: typeof o.adGoalEcho === "string" ? o.adGoalEcho : "",
    theme: normalizeTheme(o.theme),
    navLinks: parseNavLinks(o.navLinks),
    footerLinks: parseNavLinks(o.footerLinks),
    galleryImages: parseGalleryImages(o.galleryImages),
  };
}

function LandingPageEditorPageInner() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { user, loading } = useAuth();

  const [page, setPage] = useState<LandingPageRecord | null>(null);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState("draft");
  const [campaignId, setCampaignId] = useState<string>("");
  const [pageData, setPageData] = useState<LandingPageData>({});
  const [aiPrompt, setAiPrompt] = useState("");
  const [conversionGoal, setConversionGoal] = useState("");
  const [pixel, setPixel] = useState("");
  const [hostingType, setHostingType] = useState("platform");
  const [subdomain, setSubdomain] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [deploymentNotes, setDeploymentNotes] = useState("");
  const [competitorBrief, setCompetitorBrief] = useState("");
  const [competitorUrlsScan, setCompetitorUrlsScan] = useState("");
  const [scanBusy, setScanBusy] = useState(false);
  const [aiDraftBusy, setAiDraftBusy] = useState(false);
  const [aiRefineBusy, setAiRefineBusy] = useState(false);
  const [aiRefinementPrompt, setAiRefinementPrompt] = useState("");
  const [aiRefineOk, setAiRefineOk] = useState(false);
  /** Until false, avoid treating page===null as “not found” (fetch still in flight). */
  const [detailLoading, setDetailLoading] = useState(true);
  const loadGenRef = useRef(0);
  const [editorTab, setEditorTab] = useState<"design" | "settings">("design");
  const [editorZone, setEditorZone] = useState<LandingEditorZone>(null);

  const [browserOrigin, setBrowserOrigin] = useState("");
  useEffect(() => {
    setBrowserOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  const scrollToZoneId = useCallback((id: string) => {
    const el = typeof document !== "undefined" ? document.getElementById(id) : null;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (el instanceof HTMLDetailsElement) el.open = true;
  }, []);

  const patchTheme = useCallback((patch: Partial<LandingPageTheme>) => {
    setPageData((prev) => ({ ...prev, theme: { ...(prev.theme ?? {}), ...patch } }));
  }, []);

  function onInspectorJumpLook() {
    scrollToZoneId("lp-zone-look-feel");
  }

  const load = useCallback(async () => {
    if (!id || !user) return;
    const gen = ++loadGenRef.current;
    setDetailLoading(true);
    setLoadError(null);
    try {
      const [{ page: row }, exList] = await Promise.all([
        expansion.landingPages.get(id),
        api.listExperiments().catch(() => [] as Experiment[]),
      ]);
      if (gen !== loadGenRef.current) return;
      setPage(row);
      setTitle(row.title);
      setSlug(row.slug);
      setStatus(row.status);
      setCampaignId(row.campaignId ?? "");
      setHostingType(row.hostingType || "platform");
      setSubdomain(row.subdomain ?? "");
      setCustomDomain(row.customDomain ?? "");
      setDeploymentNotes(row.deploymentNotes ?? "");
      setPageData(normalizePageData(row.pageData));
      setAiPrompt(row.aiGenerationPrompt ?? "");
      setConversionGoal(row.conversionGoal ?? "");
      setPixel(row.conversionTrackingPixel ?? "");
      setExperiments(exList);
    } catch (e) {
      if (gen !== loadGenRef.current) return;
      setLoadError(e instanceof Error ? e.message : "Could not load page");
      setPage(null);
    } finally {
      if (gen === loadGenRef.current) setDetailLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    if (loading || !user) return;
    if (!id.trim()) {
      setDetailLoading(false);
      setLoadError("Invalid landing page link.");
      setPage(null);
      return;
    }
    void load();
  }, [loading, user, id, load]);

  async function save() {
    if (!id) return;
    setSaveError(null);
    setSaveOk(false);
    setSaving(true);
    try {
      const { page: row } = await expansion.landingPages.update(id, {
        title: title.trim(),
        slug: slug.trim() || undefined,
        status,
        hostingType,
        subdomain: subdomain.trim() || null,
        customDomain: customDomain.trim() || null,
        deploymentNotes: deploymentNotes.trim() || null,
        campaignId: campaignId || null,
        pageData,
        aiGenerationPrompt: aiPrompt.trim() || null,
        conversionGoal: conversionGoal.trim() || null,
        conversionTrackingPixel: pixel.trim() || null,
      });
      setPage(row);
      setTitle(row.title);
      setSlug(row.slug);
      setHostingType(row.hostingType || "platform");
      setSubdomain(row.subdomain ?? "");
      setCustomDomain(row.customDomain ?? "");
      setDeploymentNotes(row.deploymentNotes ?? "");
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!id || !confirm("Delete this landing page? This cannot be undone.")) return;
    setDeleting(true);
    setSaveError(null);
    try {
      await expansion.landingPages.delete(id);
      router.push("/landing-pages");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function runUrlAnalysis() {
    if (!competitorUrlsScan.trim()) {
      setSaveError("Paste URLs to analyze (one per line).");
      return;
    }
    setScanBusy(true);
    setSaveError(null);
    try {
      const r = await expansion.landingPages.competitorScan({ urlsText: competitorUrlsScan });
      if (r.synthesis) setCompetitorBrief(r.synthesis);
      else setSaveError(r.error ?? "We couldn’t generate a synthesis. Try again, or contact your administrator if this persists.");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanBusy(false);
    }
  }

  async function regenerateFromAi() {
    if (!id) return;
    if (!aiPrompt.trim()) {
      setSaveError("Add an AI generation prompt below before regenerating.");
      return;
    }
    setAiDraftBusy(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const { page: row } = await expansion.landingPages.aiDraft(id, {
        prompt: aiPrompt.trim(),
        conversionGoal: conversionGoal.trim() || null,
        competitorBrief: competitorBrief.trim() || undefined,
        competitorUrlsText: competitorUrlsScan.trim() || undefined,
      });
      setPage(row);
      setHostingType(row.hostingType || "platform");
      setSubdomain(row.subdomain ?? "");
      setCustomDomain(row.customDomain ?? "");
      setDeploymentNotes(row.deploymentNotes ?? "");
      setPageData(normalizePageData(row.pageData));
      setSaveOk(true);
      setEditorTab("design");
      setTimeout(() => setSaveOk(false), 2500);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "AI regenerate failed");
    } finally {
      setAiDraftBusy(false);
    }
  }

  async function applyAiRefinement() {
    if (!id) return;
    if (!aiRefinementPrompt.trim()) {
      setSaveError("Describe the changes you want (colours, copy, sections, links, gallery, etc.).");
      return;
    }
    setAiRefineBusy(true);
    setSaveError(null);
    setSaveOk(false);
    setAiRefineOk(false);
    try {
      const { page: row } = await expansion.landingPages.aiRefine(id, {
        refinementsPrompt: aiRefinementPrompt.trim(),
      });
      setPage(row);
      setHostingType(row.hostingType || "platform");
      setSubdomain(row.subdomain ?? "");
      setCustomDomain(row.customDomain ?? "");
      setDeploymentNotes(row.deploymentNotes ?? "");
      setPageData(normalizePageData(row.pageData));
      setAiRefinementPrompt("");
      setAiRefineOk(true);
      setTimeout(() => setAiRefineOk(false), 3500);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "AI refinement failed");
    } finally {
      setAiRefineBusy(false);
    }
  }

  function patchFunnelStep(index: number, patch: Partial<LandingFunnelStep>) {
    setPageData((prev) => {
      const steps = [...(prev.funnelSteps ?? [])];
      steps[index] = { ...steps[index], ...patch };
      return { ...prev, funnelSteps: steps };
    });
  }

  function removeFunnelStep(index: number) {
    setPageData((prev) => ({
      ...prev,
      funnelSteps: (prev.funnelSteps ?? []).filter((_, i) => i !== index),
    }));
  }

  function addFunnelStep() {
    setPageData((prev) => ({
      ...prev,
      funnelSteps: [
        ...(prev.funnelSteps ?? []),
        {
          key: `section-${(prev.funnelSteps?.length ?? 0) + 1}`,
          title: "",
          body: "",
        },
      ],
    }));
  }

  function setStepBullets(index: number, raw: string) {
    const bullets = raw
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    patchFunnelStep(index, { bullets: bullets.length ? bullets : undefined });
  }

  function addFaq() {
    setPageData((prev) => ({
      ...prev,
      faq: [...(prev.faq ?? []), { q: "", a: "" }],
    }));
  }

  function patchFaq(index: number, patch: Partial<{ q: string; a: string }>) {
    setPageData((prev) => {
      const faq = [...(prev.faq ?? [])];
      faq[index] = { ...faq[index], ...patch };
      return { ...prev, faq };
    });
  }

  function removeFaq(index: number) {
    setPageData((prev) => ({
      ...prev,
      faq: (prev.faq ?? []).filter((_, i) => i !== index),
    }));
  }

  function updateField(
    key:
      | "headline"
      | "subheadline"
      | "body"
      | "ctaText"
      | "ctaUrl"
      | "formEmbedHtml"
      | "thankYouCopy"
      | "seoTitle"
      | "seoDescription"
      | "formPlacementNote"
      | "adGoalEcho",
    value: string
  ) {
    setPageData((prev) => ({ ...prev, [key]: value }));
  }

  function setTrustSignalsFromLines(lines: string[]) {
    setPageData((prev) => ({ ...prev, trustSignals: lines }));
  }

  const interpolatedPublicUrl = useMemo(() => {
    if (!LANDING_PUBLIC_URL_TEMPLATE || !page?.id) return "";
    return interpolateLandingUrlTemplate(LANDING_PUBLIC_URL_TEMPLATE, {
      id: page.id,
      slug: (slug.trim() || page.slug || "page").trim(),
      subdomain: subdomain.trim(),
    });
  }, [page, slug, subdomain]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-violet-600" />
      </div>
    );
  }

  if (!id.trim()) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <AppNav />
        <main id="main-content" className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-red-600">{loadError || "Invalid landing page link."}</p>
          <Link href="/landing-pages" className="mt-4 inline-block text-violet-700 hover:underline">
            ← Back to landing pages
          </Link>
        </main>
      </div>
    );
  }

  if (detailLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-violet-600" />
      </div>
    );
  }

  if (loadError || !page) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <AppNav />
        <main id="main-content" className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-red-600">{loadError || "Landing page not found."}</p>
          <Link href="/landing-pages" className="mt-4 inline-block text-violet-700 hover:underline">
            ← Back to landing pages
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppNav />
      <main id="main-content" className="mx-auto max-w-6xl px-4 py-8">
        <Link href="/landing-pages" className="text-sm text-violet-700 hover:underline">
          ← All landing pages
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-zinc-900">Edit landing page</h1>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={deleting}
              className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
        {saveOk && <p className="mt-2 text-sm text-green-700">Saved.</p>}
        {saveError && <p className="mt-2 text-sm text-red-600">{saveError}</p>}

        <div className="mt-6 flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
          <button
            type="button"
            onClick={() => setEditorTab("design")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              editorTab === "design"
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
            }`}
          >
            Design & preview
          </button>
          <button
            type="button"
            onClick={() => setEditorTab("settings")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              editorTab === "settings"
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
            }`}
          >
            Page settings & AI
          </button>
        </div>

        {editorTab === "design" ? (
          <div className="mt-8 flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_min(20rem)] xl:items-start xl:gap-8 2xl:grid-cols-[minmax(0,1fr)_22rem]">
            <section className="rounded-xl border border-violet-200/80 bg-gradient-to-b from-violet-50/80 to-white p-5 shadow-sm xl:col-span-2">
              <h2 className="text-sm font-semibold text-zinc-900">Targeted AI changes</h2>
              <p className="mt-1 text-xs text-zinc-600">
                Ask for specific edits only—fonts, palette, hero copy, funnel sections, nav/footer links, or gallery images. Your form embed stays as-is unless you change it manually.
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                Saves, targeted AI tweaks, and full AI regenerates accumulate a funnel-style summary tied to{' '}
                <strong className="font-medium text-zinc-600">this client record</strong> you&apos;re editing (kept apart from other clients your agency manages). Future drafts steer toward patterns you&apos;ve established—nothing is shared outside your tenancy.
              </p>
              <textarea
                value={aiRefinementPrompt}
                onChange={(e) => setAiRefinementPrompt(e.target.value)}
                rows={3}
                placeholder={`e.g. Make the primary colour navy, shorten the hero subhead, add a Pricing section bullet list; on the Proof panel add two buttons labeled "Book a call" and "View pricing" with https calendar / page URLs`}
                className="mt-3 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
              />
              <button
                type="button"
                disabled={aiRefineBusy || !aiRefinementPrompt.trim()}
                onClick={() => void applyAiRefinement()}
                className="mt-3 rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-50"
              >
                {aiRefineBusy ? "Applying…" : "Apply AI changes"}
              </button>
              {aiRefineOk && (
                <p className="mt-2 text-xs text-green-700">
                  Updates applied on the server. If you tweak copy or styling below—or change title, slug, or settings—use{" "}
                  <strong className="font-medium">Save</strong> to persist those.
                </p>
              )}
            </section>

            <div className="min-w-0 xl:space-y-0">
              <LandingPageDesignCanvas
                pageData={pageData}
                updateField={updateField}
                patchFunnelStep={patchFunnelStep}
                removeFunnelStep={removeFunnelStep}
                addFunnelStep={addFunnelStep}
                setStepBullets={setStepBullets}
                patchFaq={patchFaq}
                removeFaq={removeFaq}
                addFaq={addFaq}
                setTrustSignalsFromLines={setTrustSignalsFromLines}
                patchPageData={setPageData}
                editorZone={editorZone}
                setEditorZone={setEditorZone}
              />
            </div>
            <LandingPageEditorInspector
              zone={editorZone}
              onClearZone={() => setEditorZone(null)}
              onJumpToLook={onInspectorJumpLook}
              theme={pageData.theme ?? {}}
              patchTheme={patchTheme}
              scrollToZoneId={scrollToZoneId}
            />
          </div>
        ) : (
          <div className="mt-8 space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">URL slug</label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="spring-promo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                >
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                  <option value="archived">archived</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Linked campaign (optional)</label>
                <select
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                >
                  <option value="">— None —</option>
                  {experiments.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name} ({ex.platform})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-6">
              <h2 className="text-sm font-semibold text-zinc-900">Publish on your website &amp; DNS</h2>
              <p className="mt-1 text-xs text-zinc-600">
                Capture the hostname and DNS steps here so going live stays organized. Actual DNS records are created at your registrar or Cloudflare — this workspace only saves your notes and hostname
                for the team unless your administrator automates provisioning elsewhere.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700">Where visitors will consume this funnel</label>
                  <select
                    value={hostingType}
                    onChange={(e) => setHostingType(e.target.value)}
                    className="mt-1 w-full max-w-xl rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  >
                    <option value="platform">Platform-hosted funnel URL (use DNS checklist below)</option>
                    <option value="export">Rebuilt on another site (CMS, GHL funnel, WordPress hosted page…)</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700">Planned public hostname (optional)</label>
                  <input
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    className="mt-1 w-full max-w-xl rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
                    placeholder="promo.customerdomain.com"
                    autoComplete="off"
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    Hostname only — omit https:// paths and query strings. Save validates the shape server-side.
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700">Reserved platform subdomain slug (optional)</label>
                  <input
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value)}
                    className="mt-1 w-full max-w-md rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
                    placeholder="lower-case identifier if multi-tenant hosting maps URLs"
                  />
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-950">
                <p className="font-medium text-emerald-900">Typical DNS (ask your infra owner for the real target hostname)</p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-relaxed text-emerald-900">
                  <li>
                    <strong>CNAME:</strong> point your subdomain to{" "}
                    <code className="rounded bg-white px-1.5 py-0.5 font-mono">
                      {LANDING_DNS_CNAME_TARGET || "(set NEXT_PUBLIC_LANDING_DNS_CNAME_TARGET)"}
                    </code>
                  </li>
                  <li>
                    <strong>APEX / naked domain:</strong> often requires ALIAS / CNAME flattening at Cloudflare, DNSimple, or an A record pair your host provides — follow their docs.
                  </li>
                  <li>
                    <strong>HTTPS:</strong> issue a certificate once DNS resolves (Lets Encrypt ACM, Cloudflare proxy, etc.).
                  </li>
                </ul>
                {LANDING_PUBLIC_URL_TEMPLATE ? (
                  <p className="mt-3 border-t border-emerald-200/70 pt-3 text-[11px] leading-relaxed text-emerald-900/90">
                    Public URL template in env:&nbsp;
                    <code className="break-all rounded bg-white px-2 py-0.5 font-mono">{LANDING_PUBLIC_URL_TEMPLATE}</code>
                    {interpolatedPublicUrl ? (
                      <>
                        <br />
                        Resolved example:&nbsp;<strong className="break-all">{interpolatedPublicUrl}</strong>
                      </>
                    ) : null}
                  </p>
                ) : null}
                {browserOrigin && id ? (
                  <p className="mt-2 text-[11px] text-emerald-900/85">
                    Staff editor URL:&nbsp;
                    <code className="break-all rounded bg-white px-1.5 py-0.5 font-mono">{`${browserOrigin}/landing-pages/${id}`}</code>
                  </p>
                ) : null}
              </div>

              <label className="mt-6 block">
                <span className="text-sm font-medium text-zinc-700">DNS / registrar / verification notes</span>
                <textarea
                  value={deploymentNotes}
                  onChange={(e) => setDeploymentNotes(e.target.value)}
                  rows={5}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs"
                  placeholder="Paste TXT proofs, CDN steps, registrar screenshots links, stakeholder sign-off…"
                />
              </label>
            </div>

            <div className="border-t border-zinc-100 pt-6">
              <h2 className="text-sm font-semibold text-zinc-900">AI & tracking</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Edit headlines, funnel sections, FAQs, branding and embed in <strong className="font-medium text-zinc-700">Design &amp; preview</strong>. Use{" "}
                <strong className="font-medium text-zinc-700">Targeted AI changes</strong> there for incremental edits; use{" "}
                <strong className="font-medium text-zinc-700">Regenerate full funnel</strong> here to rebuild from scratch.
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700">Competitor URLs to analyze</label>
                  <textarea
                    value={competitorUrlsScan}
                    onChange={(e) => setCompetitorUrlsScan(e.target.value)}
                    rows={3}
                    placeholder="One URL per line (optional — fills research notes below)"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs"
                  />
                  <button
                    type="button"
                    disabled={scanBusy || !competitorUrlsScan.trim()}
                    onClick={() => void runUrlAnalysis()}
                    className="mt-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {scanBusy ? "Analyzing…" : "Run URL analysis"}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700">Competitor research notes</label>
                  <textarea
                    value={competitorBrief}
                    onChange={(e) => setCompetitorBrief(e.target.value)}
                    rows={6}
                    placeholder="Paste insights here, or run URL analysis above. Used when you regenerate with AI."
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700">AI generation prompt</label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={3}
                    placeholder="Describe the offer, audience, and tone…"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={aiDraftBusy || !aiPrompt.trim()}
                    onClick={() => void regenerateFromAi()}
                    className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {aiDraftBusy ? "Regenerating…" : "Regenerate full funnel with AI"}
                  </button>
                  <p className="mt-1 text-xs text-zinc-500">
                    Rebuilds funnel content in Design & preview. Your HTML embed is kept unless you change it there before regenerating.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700">Conversion goal</label>
                  <input
                    value={conversionGoal}
                    onChange={(e) => setConversionGoal(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    placeholder="e.g. Lead form submit"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700">Tracking pixel / snippet</label>
                  <textarea
                    value={pixel}
                    onChange={(e) => setPixel(e.target.value)}
                    rows={2}
                    placeholder="Paste Meta/Google snippet or image URL"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function LandingPageEditorPage() {
  return (
    <ExpansionProductGate productKey="landing_pages">
      <LandingPageEditorPageInner />
    </ExpansionProductGate>
  );
}
