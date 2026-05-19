"use client";

import type { Dispatch, MouseEvent, SetStateAction, SyntheticEvent } from "react";
import { useMemo } from "react";
import type { LandingEditorZone } from "@/components/LandingPageEditorInspector";
import LandingEmbedResizeHandle from "@/components/LandingEmbedResizeHandle";
import LandingHeroBackdropStack from "@/components/LandingHeroBackdropStack";
import LandingResizeBar from "@/components/LandingResizeBar";
import type {
  LandingFunnelStep,
  LandingGalleryImage,
  LandingNavLinkRow,
  LandingPageData,
  LandingPageTheme,
  LandingStepButton,
} from "@/lib/api";
import {
  cornerRoundingClass,
  embedColumnWidthPx,
  landingBandsMatchHeroBackdrop,
  landingContentColumnStyle,
  landingDesignRootVars,
  landingEmbedIframeVars,
  landingFaqSpacing,
  landingFunnelSectionSpacing,
  landingGalleryThumbStyle,
  landingHeroSpacing,
  landingUsesCustomContentColumn,
  normalizeHex,
  resolveBodyFont,
  resolveHeadingFont,
} from "@/lib/landingPageTheme";

/** Visitor-style anchor for section CTAs in the design preview. */
function landingSectionBtnPreviewClass(
  variant: LandingStepButton["variant"] | undefined,
  bleed: boolean,
  cornerRounding: string
): string {
  const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const base = `${cornerRounding} ${ring} inline-flex min-h-[42px] items-center justify-center px-5 py-2.5 text-sm font-semibold transition`;
  const v = variant ?? "primary";
  if (bleed) {
    if (v === "outline") {
      return `${base} border border-white/60 bg-transparent text-white hover:bg-white/10 focus-visible:ring-white/50 focus-visible:ring-offset-black/40`;
    }
    if (v === "ghost") {
      return `${base} bg-transparent px-3 text-white/95 underline underline-offset-4 hover:text-white focus-visible:ring-white/50 focus-visible:ring-offset-black/40`;
    }
    return `${base} border border-white/25 bg-white text-zinc-900 shadow-md hover:bg-zinc-50 focus-visible:ring-white/60 focus-visible:ring-offset-black/40`;
  }
  if (v === "outline") {
    return `${base} border-2 border-[color:var(--lp-primary)] bg-transparent text-[color:var(--lp-primary)] hover:bg-violet-50 focus-visible:ring-violet-300`;
  }
  if (v === "ghost") {
    return `${base} bg-transparent px-3 text-[color:var(--lp-primary)] underline underline-offset-4 hover:opacity-90 focus-visible:ring-violet-200`;
  }
  return `${base} border border-transparent bg-[color:var(--lp-primary)] text-white shadow-sm hover:brightness-105 focus-visible:ring-violet-400`;
}

type FieldKey =
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
  | "adGoalEcho";

export type LandingPageDesignCanvasProps = {
  pageData: LandingPageData;
  updateField: (key: FieldKey, value: string) => void;
  patchFunnelStep: (index: number, patch: Partial<LandingFunnelStep>) => void;
  removeFunnelStep: (index: number) => void;
  addFunnelStep: () => void;
  setStepBullets: (index: number, raw: string) => void;
  patchFaq: (index: number, patch: Partial<{ q: string; a: string }>) => void;
  removeFaq: (index: number) => void;
  addFaq: () => void;
  setTrustSignalsFromLines: (lines: string[]) => void;
  patchPageData: Dispatch<SetStateAction<LandingPageData>>;
  editorZone?: LandingEditorZone | null;
  setEditorZone?: Dispatch<SetStateAction<LandingEditorZone>>;
};

function editableSurfaceClick(ev: SyntheticEvent, zone: LandingEditorZone, setZone: Dispatch<SetStateAction<LandingEditorZone>>) {
  const t = ev.target;
  if (!(t instanceof HTMLElement)) return;
  if (t.closest('[role="separator"]')) return;
  if (t.closest('input:not([type="checkbox"]):not([type="radio"]), textarea, select, button, a, summary'))
    return;
  setZone(zone);
}

function zoneRing(active: boolean) {
  return active ? "ring-2 ring-violet-400/75 ring-offset-2 ring-offset-white" : "";
}

/** In-page anchors (e.g. #landing-book) scroll within the design preview instead of reloading. */
function handleLandingDesignAnchoredNav(ev: MouseEvent<HTMLDivElement>) {
  if (!(ev.target instanceof Element)) return;
  const a = ev.target.closest("a[href]");
  if (!(a instanceof HTMLAnchorElement)) return;
  const href = (a.getAttribute("href") ?? "").trim();
  if (!href.startsWith("#") || href === "#") return;
  const frag = href.slice(1);
  if (!/^[a-zA-Z][\w.-]{0,240}$/.test(frag)) return;
  let target: HTMLElement | null = null;
  try {
    target = ev.currentTarget.querySelector(`#${CSS.escape(frag)}`);
  } catch {
    return;
  }
  if (!target || !(target instanceof HTMLElement)) return;
  ev.preventDefault();
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Visitor-style landing layout with inline editable fields (no separate “code view”). */
export default function LandingPageDesignCanvas({
  pageData,
  updateField,
  patchFunnelStep,
  removeFunnelStep,
  addFunnelStep,
  setStepBullets,
  patchFaq,
  removeFaq,
  addFaq,
  setTrustSignalsFromLines,
  patchPageData,
  editorZone = null,
  setEditorZone = () => {},
}: LandingPageDesignCanvasProps) {
  const funnelIndexes = useMemo(() => {
    const rawSteps = pageData.funnelSteps ?? [];
    const pairs: { step: LandingFunnelStep; index: number }[] = [];
    rawSteps.forEach((step, index) => {
      const k = (step.key ?? "").trim().toLowerCase();
      if (k === "hero") return;
      pairs.push({ step, index });
    });
    return pairs;
  }, [pageData.funnelSteps]);

  const headline = pageData.headline ?? "";
  const subheadline = pageData.subheadline ?? "";
  const body = pageData.body ?? "";
  const theme = pageData.theme ?? {};
  const navLinks = pageData.navLinks ?? [];
  const footerLinks = pageData.footerLinks ?? [];
  const galleryImages = pageData.galleryImages ?? [];
  const ctaCorners = cornerRoundingClass(theme.cornerRadius);
  const embedCorners = cornerRoundingClass(theme.formEmbedCardRadius ?? theme.cornerRadius);
  const embedMaxW = theme.formEmbedMaxWidth?.trim() || "36rem";
  const embedOuterPadPx = theme.formEmbedOuterPaddingPx ?? 24;
  const colSx = landingContentColumnStyle(theme);
  const colMaxCustom = landingUsesCustomContentColumn(theme);
  const heroSp = landingHeroSpacing(theme);
  const funnelSp = landingFunnelSectionSpacing(theme);
  const faqSp = landingFaqSpacing(theme);
  const bleed = landingBandsMatchHeroBackdrop(theme);
  /** Default hero column matches prior max-w-3xl (~768px) when untouched. */
  const proseWrap = `${colMaxCustom ? "" : "max-w-3xl"}`;
  const galleryWrap = `${colMaxCustom ? "" : "max-w-4xl"}`;

  const patchTheme = (patch: Partial<LandingPageTheme>) =>
    patchPageData((prev) => ({
      ...prev,
      theme: { ...(prev.theme ?? {}), ...patch },
    }));

  function patchNavAt(index: number, patch: Partial<LandingNavLinkRow>) {
    patchPageData((prev) => {
      const nl = [...(prev.navLinks ?? [])];
      nl[index] = { ...(nl[index] ?? { label: "", href: "" }), ...patch };
      return { ...prev, navLinks: nl };
    });
  }

  function addNav() {
    patchPageData((prev) => ({
      ...prev,
      navLinks: [...(prev.navLinks ?? []), { label: "", href: "/" }],
    }));
  }

  function removeNav(i: number) {
    patchPageData((prev) => ({
      ...prev,
      navLinks: (prev.navLinks ?? []).filter((_, j) => j !== i),
    }));
  }

  function patchGalleryAt(index: number, patch: Partial<LandingGalleryImage>) {
    patchPageData((prev) => {
      const g = [...(prev.galleryImages ?? [])];
      g[index] = { ...(g[index] ?? { url: "" }), ...patch };
      return { ...prev, galleryImages: g };
    });
  }

  function addGallery() {
    patchPageData((prev) => ({
      ...prev,
      galleryImages: [...(prev.galleryImages ?? []), { url: "", alt: "" }],
    }));
  }

  function removeGallery(i: number) {
    patchPageData((prev) => ({
      ...prev,
      galleryImages: (prev.galleryImages ?? []).filter((_, j) => j !== i),
    }));
  }

  function patchFooterAt(index: number, patch: Partial<LandingNavLinkRow>) {
    patchPageData((prev) => {
      const fl = [...(prev.footerLinks ?? [])];
      fl[index] = { ...(fl[index] ?? { label: "", href: "" }), ...patch };
      return { ...prev, footerLinks: fl };
    });
  }

  function addFooter() {
    patchPageData((prev) => ({
      ...prev,
      footerLinks: [...(prev.footerLinks ?? []), { label: "", href: "/" }],
    }));
  }

  function removeFooter(i: number) {
    patchPageData((prev) => ({
      ...prev,
      footerLinks: (prev.footerLinks ?? []).filter((_, j) => j !== i),
    }));
  }

  function patchSectionButton(stepIndex: number, buttonIdx: number, patch: Partial<LandingStepButton>) {
    patchPageData((prev) => {
      const fs = [...(prev.funnelSteps ?? [])];
      const step = fs[stepIndex];
      if (!step) return prev;
      const btns = [...(step.buttons ?? [])];
      const cur = btns[buttonIdx] ?? { label: "", href: "" };
      btns[buttonIdx] = { ...cur, ...patch };
      fs[stepIndex] = { ...step, buttons: btns.length ? btns : undefined };
      return { ...prev, funnelSteps: fs };
    });
  }

  function addSectionButton(stepIndex: number) {
    patchPageData((prev) => {
      const fs = [...(prev.funnelSteps ?? [])];
      const step = fs[stepIndex];
      if (!step) return prev;
      const btns = [...(step.buttons ?? []), { label: "Book calendar", href: "https://" }];
      fs[stepIndex] = { ...step, buttons: btns };
      return { ...prev, funnelSteps: fs };
    });
  }

  function removeSectionButton(stepIndex: number, buttonIdx: number) {
    patchPageData((prev) => {
      const fs = [...(prev.funnelSteps ?? [])];
      const step = fs[stepIndex];
      if (!step?.buttons?.length) return prev;
      const btns = step.buttons.filter((_, j) => j !== buttonIdx);
      fs[stepIndex] = { ...step, buttons: btns.length ? btns : undefined };
      return { ...prev, funnelSteps: fs };
    });
  }

  return (
    <div
      className="landing-design-root rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-200/60 ring-1 ring-black/5"
      style={{ ...landingDesignRootVars(theme), fontFamily: resolveBodyFont(theme) }}
      onClick={handleLandingDesignAnchoredNav}
    >
      <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Design preview — click Save to persist changes</p>
        <p className="mt-1 text-[11px] leading-snug text-zinc-400">
          Each funnel panel can include its own Buttons block (below bullets) for calendar/demo links — no HTML. The step whose key is{" "}
          <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-[10px] text-zinc-700">hero</code> mirrors
          the headline area above and is not duplicated in the sections list. Drag violet bars on blocks to resize width,
          heights, spacing, and typography.
        </p>
      </div>

      <details
        id="lp-zone-look-feel"
        className={`group border-b border-zinc-200 bg-white px-4 py-2 open:bg-zinc-50/80 ${zoneRing(editorZone === "look")}`}
      >
        <summary className="cursor-pointer text-sm font-medium text-zinc-800">Look &amp; feel (colours, fonts, hero image)</summary>
        <div
          className="mt-4 grid gap-4 pb-4 sm:grid-cols-2 lg:grid-cols-3"
          onFocusCapture={() => setEditorZone("look")}
          onPointerDownCapture={(e) => editableSurfaceClick(e, "look", setEditorZone)}
        >
          <label className="block text-xs font-medium text-zinc-600">
            Primary colour
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={normalizeHex(theme.primaryHex, "#6d28d9")}
                onChange={(e) => patchTheme({ primaryHex: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded border border-zinc-300 bg-white p-0.5"
              />
              <input
                value={theme.primaryHex ?? ""}
                onChange={(e) => patchTheme({ primaryHex: e.target.value })}
                placeholder="#6d28d9"
                className="flex-1 rounded-md border border-zinc-300 px-2 py-1.5 font-mono text-xs"
              />
            </div>
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Accent colour
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={normalizeHex(theme.accentHex, "#c4b5fd")}
                onChange={(e) => patchTheme({ accentHex: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded border border-zinc-300 bg-white p-0.5"
              />
              <input
                value={theme.accentHex ?? ""}
                onChange={(e) => patchTheme({ accentHex: e.target.value })}
                placeholder="#c4b5fd"
                className="flex-1 rounded-md border border-zinc-300 px-2 py-1.5 font-mono text-xs"
              />
            </div>
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Corner style
            <select
              value={theme.cornerRadius ?? "rounded"}
              onChange={(e) => patchTheme({ cornerRadius: e.target.value as LandingPageTheme["cornerRadius"] })}
              className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-2 text-sm"
            >
              <option value="rounded">Rounded</option>
              <option value="square">Square</option>
              <option value="pill">Pill</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-zinc-600 sm:col-span-2 lg:col-span-3">
            Hero background image URL (https or /path)
            <input
              value={theme.heroBgImageUrl ?? ""}
              onChange={(e) => patchTheme({ heroBgImageUrl: e.target.value })}
              className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-2 text-sm"
              placeholder="https://…/hero.jpg"
            />
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-xs font-medium text-zinc-600 sm:col-span-2 lg:col-span-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-400"
              checked={bleed}
              onChange={(e) =>
                patchTheme({ belowHeroBackdrop: e.target.checked ? "matchHero" : "isolateHero" })
              }
            />
            <span className="leading-snug">
              Extend hero backdrop down through funnel, gallery, trust, FAQs &amp; footer (matches the cinematic
              hero strip).
              <span className="block font-normal text-zinc-400">
                Leave off for zebra light-grey sections below the hero only.
              </span>
            </span>
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Heading font
            <select
              value={theme.headingFontPreset ?? "modern"}
              onChange={(e) => patchTheme({ headingFontPreset: e.target.value, headingFontCss: undefined })}
              className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-2 text-sm"
            >
              <option value="modern">Modern sans</option>
              <option value="system">System UI</option>
              <option value="serif">Serif</option>
              <option value="mono">Mono</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Body font
            <select
              value={theme.bodyFontPreset ?? "system"}
              onChange={(e) => patchTheme({ bodyFontPreset: e.target.value, bodyFontCss: undefined })}
              className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-2 text-sm"
            >
              <option value="system">System UI</option>
              <option value="modern">Modern sans</option>
              <option value="serif">Serif</option>
              <option value="mono">Mono</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-zinc-600 sm:col-span-2">
            Custom heading stack (optional)
            <input
              value={theme.headingFontCss ?? ""}
              onChange={(e) => patchTheme({ headingFontCss: e.target.value })}
              className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-2 font-mono text-xs"
              placeholder={'e.g. "Playfair Display", Georgia, serif'}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600 sm:col-span-2">
            Custom body stack (optional)
            <input
              value={theme.bodyFontCss ?? ""}
              onChange={(e) => patchTheme({ bodyFontCss: e.target.value })}
              className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-2 font-mono text-xs"
            />
          </label>
          <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 pt-4 sm:col-span-2 lg:col-span-3">
            <p className="mb-3 px-2 text-[11px] font-medium text-zinc-700">Whole preview text size — drag vertically</p>
            <LandingResizeBar
              axis="y"
              layout="horizontalStrip"
              ariaLabel="Resize funnel preview typography"
              title="Pull to enlarge or shrink all text proportionally"
              getValue={() => theme.previewRootFontSizePx ?? 16}
              clamp={[12, 23]}
              apply={(n) => patchTheme({ previewRootFontSizePx: n })}
              onBegin={() => setEditorZone("look")}
            />
          </div>
        </div>
      </details>

      <div
        id="lp-zone-nav-editor"
        className={`border-b border-zinc-200 bg-white px-4 py-3 ${zoneRing(editorZone === "nav")}`}
        onFocusCapture={() => setEditorZone("nav")}
        onPointerDownCapture={(e) => editableSurfaceClick(e, "nav", setEditorZone)}
      >
        <div className={`mx-auto flex w-full flex-col gap-2 ${galleryWrap}`} style={colSx}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Top navigation links</span>
            <button
              type="button"
              onClick={addNav}
              className="text-xs font-medium text-violet-700 hover:underline"
            >
              + Add link
            </button>
          </div>
          {navLinks.length === 0 ? (
            <p className="text-xs text-zinc-400">Optional — pricing, FAQs, booking, privacy, etc.</p>
          ) : (
            <div className="space-y-2">
              {navLinks.map((link, i) => (
                <div key={`nav-${i}`} className="flex flex-wrap items-end gap-2 rounded-lg border border-zinc-200 bg-zinc-50/70 p-2">
                  <label className="min-w-[8rem] flex-1 text-[11px] text-zinc-600">
                    Label
                    <input
                      value={link.label}
                      onChange={(e) => patchNavAt(i, { label: e.target.value })}
                      className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="min-w-[10rem] flex-[2] text-[11px] text-zinc-600">
                    URL
                    <input
                      value={link.href}
                      onChange={(e) => patchNavAt(i, { href: e.target.value })}
                      className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1 font-mono text-xs"
                      placeholder="/pricing"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-[11px] text-zinc-600">
                    <input
                      type="checkbox"
                      checked={!!link.newTab}
                      onChange={(e) => patchNavAt(i, { newTab: e.target.checked })}
                    />{" "}
                    New tab
                  </label>
                  <button type="button" onClick={() => removeNav(i)} className="text-xs text-red-600 hover:underline">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hero */}
      <section
        id="lp-zone-hero"
        className={`relative overflow-hidden px-6 text-white md:px-12 ${heroSp.className} ${zoneRing(editorZone === "hero")}`}
        style={heroSp.padStyle}
        onFocusCapture={() => setEditorZone("hero")}
        onPointerDownCapture={(e) => editableSurfaceClick(e, "hero", setEditorZone)}
      >
        <LandingHeroBackdropStack theme={theme} />
        <div
          className={`relative z-10 mx-auto w-full ${proseWrap} pr-10`}
          style={{ ...colSx, fontFamily: resolveBodyFont(theme) }}
        >
          {(navLinks.length > 0 && navLinks.some((n) => n.label.trim())) ? (
            <nav className="mb-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-white/10 pb-4 text-sm">
              {navLinks
                .filter((n) => n.label.trim() && n.href.trim())
                .map((n, i) => (
                  <a
                    key={`nav-vis-${n.href}-${i}`}
                    href={n.href}
                    target={n.newTab ? "_blank" : undefined}
                    rel={n.newTab ? "noopener noreferrer" : undefined}
                    className="font-medium text-white/90 underline-offset-4 hover:text-white hover:underline"
                  >
                    {n.label}
                  </a>
                ))}
            </nav>
          ) : null}
          <label className="mb-6 flex flex-wrap items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-200">Goal line</span>
            <input
              value={pageData.adGoalEcho ?? ""}
              onChange={(e) => updateField("adGoalEcho", e.target.value)}
              className="min-w-[10rem] flex-1 border-b border-transparent bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/35 focus:border-violet-300"
              placeholder="e.g. Book a strategy call"
              style={{ fontFamily: resolveBodyFont(theme) }}
            />
          </label>
          <label className="block">
            <span className="sr-only">Headline</span>
            <textarea
              value={headline}
              onChange={(e) => updateField("headline", e.target.value)}
              rows={Math.min(6, Math.max(2, headline.split("\n").length || 2))}
              placeholder="Headline — big promise visitors see first"
              className="w-full resize-none bg-transparent text-3xl font-bold leading-tight tracking-tight text-white placeholder:text-zinc-500 focus:outline-none focus:ring-0 md:text-4xl lg:text-5xl"
              style={{ fontFamily: resolveHeadingFont(theme) }}
            />
          </label>
          <label className="mt-5 block">
            <span className="sr-only">Subheadline</span>
            <textarea
              value={subheadline}
              onChange={(e) => updateField("subheadline", e.target.value)}
              rows={Math.min(5, Math.max(2, subheadline.split("\n").length || 2))}
              placeholder="Supporting line — clarify who it’s for and what they get"
              className="w-full resize-none bg-transparent text-lg leading-relaxed text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-0 md:text-xl"
              style={{ fontFamily: resolveHeadingFont(theme) }}
            />
          </label>
          <label className="mt-8 block">
            <span className="sr-only">Lead paragraph</span>
            <textarea
              value={body}
              onChange={(e) => updateField("body", e.target.value)}
              rows={Math.min(12, Math.max(4, body.split("\n").length || 4))}
              placeholder="Hero body — expand on the offer (paragraphs)."
              className="w-full resize-none bg-transparent text-base leading-relaxed text-zinc-300 placeholder:text-zinc-500 focus:outline-none focus:ring-0"
              style={{ fontFamily: resolveBodyFont(theme) }}
            />
          </label>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="flex flex-1 flex-col gap-1 sm:max-w-xs">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-200">Button label</span>
              <input
                value={pageData.ctaText ?? ""}
                onChange={(e) => updateField("ctaText", e.target.value)}
                className={`border border-white/30 bg-white px-5 py-3 text-center text-base font-semibold shadow-lg placeholder:text-zinc-400 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30 ${ctaCorners}`}
                style={{ color: normalizeHex(theme.primaryHex, "#5b21b6") }}
                placeholder="Get started"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 sm:min-w-[200px]">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-200">Button link</span>
              <input
                value={pageData.ctaUrl ?? ""}
                onChange={(e) => updateField("ctaUrl", e.target.value)}
                className={`border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400/30 ${ctaCorners}`}
                placeholder="Primary CTA destination — https://…, /thank-you, or #landing-book / #landing-form"
              />
            </label>
          </div>

          <label className="mt-8 block rounded-lg border border-white/10 bg-white/5 p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Form placement note</span>
            <input
              value={pageData.formPlacementNote ?? ""}
              onChange={(e) => updateField("formPlacementNote", e.target.value)}
              className="mt-1 w-full bg-transparent text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none"
              placeholder="e.g. Form sits below proof section"
            />
          </label>
          <LandingResizeBar
            axis="y"
            layout="horizontalStrip"
            ariaLabel="Resize hero vertical padding"
            title="Adjust hero top/bottom space"
            getValue={() => theme.heroPaddingYPx ?? 72}
            clamp={[32, 240]}
            apply={(n) => patchTheme({ heroPaddingYPx: n })}
            onBegin={() => setEditorZone("hero")}
          />
          <LandingResizeBar
            axis="x"
            layout="verticalThumb"
            ariaLabel="Resize main content column width"
            title="Wide or narrow column (hero, funnel, trust, FAQ…)"
            className="absolute right-0 top-16 z-30 h-[min(360px,calc(100%-80px))] rounded-l-md rounded-r-none"
            getValue={() => theme.contentColumnMaxWidthPx ?? 768}
            clamp={[320, 1200]}
            apply={(n) => patchTheme({ contentColumnMaxWidthPx: n })}
            onBegin={() => setEditorZone("look")}
          />
        </div>
      </section>

      {/* Funnel sections */}
      {funnelIndexes.map(({ step, index }, visualRank) => {
        const zebra = visualRank % 2 === 0;
        const bandSurface = bleed
          ? "relative z-0 overflow-hidden border-white/10 text-white"
          : `border-zinc-100 ${zebra ? "bg-white" : "bg-zinc-50/90"}`;
        return (
          <section
            key={`${step.key ?? "step"}-${index}`}
            id={`lp-zone-section-${index}`}
            className={`border-t px-6 md:px-12 ${funnelSp.className} ${bandSurface} ${zoneRing(editorZone === `section-${index}`)}`}
            style={funnelSp.padStyle}
            onFocusCapture={() => setEditorZone(`section-${index}`)}
            onPointerDownCapture={(e) =>
              editableSurfaceClick(e, `section-${index}` as LandingEditorZone, setEditorZone)
            }
          >
            {bleed ? <LandingHeroBackdropStack theme={theme} /> : null}
            <div className={`relative z-10 mx-auto w-full ${proseWrap}`} style={colSx}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span
                  className={
                    bleed
                      ? "rounded-md border border-white/15 bg-white/10 px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide text-zinc-100"
                      : "rounded-md bg-violet-100 px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide text-violet-800"
                  }
                >
                  {(step.key ?? "").trim() || `section-${visualRank + 1}`}
                </span>
                <button
                  type="button"
                  onClick={() => removeFunnelStep(index)}
                  className={
                    bleed
                      ? "text-xs font-medium text-red-400 hover:text-red-300 hover:underline"
                      : "text-xs font-medium text-red-600 hover:text-red-800 hover:underline"
                  }
                >
                  Remove section
                </button>
              </div>
              <label className="block">
                <span className="sr-only">Section title</span>
                <textarea
                  value={step.title ?? ""}
                  onChange={(e) => patchFunnelStep(index, { title: e.target.value })}
                  rows={Math.min(3, Math.max(1, (step.title ?? "").split("\n").length))}
                  placeholder="Section headline"
                  className={
                    bleed
                      ? "w-full resize-none bg-transparent text-2xl font-semibold tracking-tight text-white placeholder:text-zinc-500 focus:outline-none md:text-3xl"
                      : "w-full resize-none bg-transparent text-2xl font-semibold tracking-tight placeholder:text-zinc-400 focus:outline-none md:text-3xl"
                  }
                  style={bleed ? { fontFamily: resolveHeadingFont(theme) } : { fontFamily: resolveHeadingFont(theme), color: "var(--lp-primary)" }}
                />
              </label>
              <label className="mt-5 block">
                <span className="sr-only">Section body</span>
                <textarea
                  value={step.body ?? ""}
                  onChange={(e) => patchFunnelStep(index, { body: e.target.value })}
                  rows={Math.min(14, Math.max(4, (step.body ?? "").split("\n").length || 4))}
                  placeholder="Paragraphs for this section."
                  className={
                    bleed
                      ? "w-full resize-none bg-transparent text-base leading-relaxed text-zinc-200 placeholder:text-zinc-400 focus:outline-none"
                      : "w-full resize-none bg-transparent text-base leading-relaxed text-zinc-600 placeholder:text-zinc-400 focus:outline-none"
                  }
                  style={{ fontFamily: resolveBodyFont(theme) }}
                />
              </label>
              <div
                className={
                  bleed
                    ? "mt-6 rounded-xl border border-dashed border-white/25 bg-black/25 p-4"
                    : "mt-6 rounded-xl border border-dashed border-zinc-200 bg-white/80 p-4"
                }
              >
                <p
                  className={
                    bleed ? "text-[11px] font-semibold uppercase tracking-wide text-zinc-400" : "text-[11px] font-semibold uppercase tracking-wide text-zinc-500"
                  }
                >
                  Bullet points
                </p>
                <p className={`mt-1 text-xs ${bleed ? "text-zinc-500" : "text-zinc-400"}`}>
                  One line per bullet — shown as a list below.
                </p>
                {(step.bullets?.length ?? 0) > 0 ? (
                  <ul
                    className={
                      bleed
                        ? "mt-4 list-disc space-y-2 pl-5 text-zinc-100 marker:text-[color:var(--lp-accent)]"
                        : "mt-4 list-disc space-y-2 pl-5 text-zinc-800 marker:text-[color:var(--lp-accent)]"
                    }
                  >
                    {(step.bullets ?? []).map((b, bi) => (
                      <li key={`${bi}-${b.slice(0, 16)}`}>{b}</li>
                    ))}
                  </ul>
                ) : null}
                <textarea
                  value={(step.bullets ?? []).join("\n")}
                  onChange={(e) => setStepBullets(index, e.target.value)}
                  rows={4}
                  className={
                    bleed
                      ? "mt-4 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm text-white placeholder:text-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                      : "mt-4 w-full rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                  }
                  placeholder={"Outcome one\nOutcome two"}
                />
              </div>

              <div
                className={
                  bleed
                    ? "mt-6 rounded-xl border border-dashed border-violet-300/35 bg-black/22 p-4"
                    : "mt-6 rounded-xl border border-dashed border-violet-300/70 bg-violet-50/50 p-4"
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className={
                        bleed ? "text-[11px] font-semibold uppercase tracking-wide text-zinc-200" : "text-[11px] font-semibold uppercase tracking-wide text-violet-800"
                      }
                    >
                      Section buttons
                    </p>
                    <p className={`mt-1 text-xs leading-snug ${bleed ? "text-zinc-400" : "text-zinc-500"}`}>
                      Link to elsewhere (https) — or scroll to the embed on{" "}
                      <span className="font-mono">this</span> page with{" "}
                      <span className="font-mono">#landing-book</span> (whole lead/booking band) or{" "}
                      <span className="font-mono">#landing-form</span> (the form/calendar iframe card).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addSectionButton(index)}
                    className={
                      bleed
                        ? "shrink-0 text-xs font-medium text-violet-300 hover:underline"
                        : "shrink-0 text-xs font-medium text-violet-700 hover:underline"
                    }
                  >
                    + Add button
                  </button>
                </div>

                {!step.buttons?.length ? (
                  <p className={`mt-4 text-xs ${bleed ? "text-zinc-400" : "text-zinc-400"}`}>
                    Optional — e.g. paste <span className="font-mono">https://…</span> for an external site, or{" "}
                    <span className="font-mono">#landing-book</span> / <span className="font-mono">#landing-form</span>{" "}
                    to jump down to your on-page scheduler or embedded form when visitors click Save and view the funnel.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-3">
                    {(step.buttons ?? []).map((btn, bi) => (
                      <div
                        key={`sb-${index}-${bi}`}
                        className={
                          bleed
                            ? "grid gap-2 rounded-lg border border-white/18 bg-black/30 p-3 sm:grid-cols-2 lg:grid-cols-12 lg:gap-3 lg:items-end"
                            : "grid gap-2 rounded-lg border border-zinc-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-12 lg:gap-3 lg:items-end"
                        }
                      >
                        <label className={`text-[10px] font-medium uppercase lg:col-span-3 ${bleed ? "text-zinc-400" : "text-zinc-600"}`}>
                          Label
                          <input
                            value={btn.label}
                            onChange={(e) => patchSectionButton(index, bi, { label: e.target.value })}
                            className={
                              bleed
                                ? "mt-1 w-full rounded border border-white/25 bg-black/35 px-2 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                                : "mt-1 w-full rounded border border-zinc-300 px-2 py-2 text-sm placeholder:text-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                            }
                            placeholder="Book calendar"
                          />
                        </label>
                        <label className={`text-[10px] font-medium uppercase lg:col-span-4 ${bleed ? "text-zinc-400" : "text-zinc-600"}`}>
                          Link URL
                          <input
                            value={btn.href}
                            onChange={(e) => {
                              const v = e.target.value;
                              const patch: Partial<LandingStepButton> = { href: v };
                              if (v.trim().startsWith("#")) patch.newTab = false;
                              patchSectionButton(index, bi, patch);
                            }}
                            className={
                              bleed
                                ? "mt-1 w-full rounded border border-white/25 bg-black/35 px-2 py-2 font-mono text-xs text-white placeholder:text-zinc-500 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                                : "mt-1 w-full rounded border border-zinc-300 px-2 py-2 font-mono text-xs placeholder:text-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                            }
                            placeholder="#landing-book or https://…"
                          />
                          <div className={`mt-2 flex flex-wrap items-center gap-2 ${bleed ? "text-zinc-400" : "text-zinc-500"}`}>
                            <span className="text-[10px] font-semibold uppercase tracking-wide">Scroll to embed</span>
                            <button
                              type="button"
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                                bleed
                                  ? "border-white/30 bg-white/5 text-zinc-200 hover:bg-white/10"
                                  : "border-zinc-200 bg-white text-zinc-700 hover:border-violet-300"
                              }`}
                              onClick={() =>
                                patchSectionButton(index, bi, { href: "#landing-book", newTab: false })
                              }
                            >
                              #landing-book
                            </button>
                            <button
                              type="button"
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                                bleed
                                  ? "border-white/30 bg-white/5 text-zinc-200 hover:bg-white/10"
                                  : "border-zinc-200 bg-white text-zinc-700 hover:border-violet-300"
                              }`}
                              onClick={() =>
                                patchSectionButton(index, bi, { href: "#landing-form", newTab: false })
                              }
                            >
                              #landing-form
                            </button>
                          </div>
                        </label>
                        <label className={`text-[10px] font-medium uppercase lg:col-span-2 ${bleed ? "text-zinc-400" : "text-zinc-600"}`}>
                          Style
                          <select
                            value={btn.variant ?? "primary"}
                            onChange={(e) => {
                              const v = e.target.value;
                              patchSectionButton(index, bi, {
                                variant:
                                  v === "primary"
                                    ? undefined
                                    : (v as NonNullable<LandingStepButton["variant"]>),
                              });
                            }}
                            className={
                              bleed
                                ? "mt-1 w-full rounded border border-white/25 bg-black/35 px-2 py-2 text-sm text-white focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                                : "mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                            }
                          >
                            <option value="primary">Primary</option>
                            <option value="outline">Outline</option>
                            <option value="ghost">Text</option>
                          </select>
                        </label>
                        <label
                          className={`flex cursor-pointer items-center gap-2 lg:col-span-2 ${bleed ? "text-xs text-zinc-300" : "text-xs text-zinc-600"}`}
                        >
                          <input
                            type="checkbox"
                            className={`h-4 w-4 rounded border-zinc-500 ${bleed ? "border-white/40 bg-transparent" : ""}`}
                            checked={!!btn.newTab}
                            disabled={(btn.href || "").trim().startsWith("#")}
                            onChange={(e) => patchSectionButton(index, bi, { newTab: e.target.checked })}
                          />
                          New tab
                        </label>
                        <div className="flex lg:col-span-1 lg:justify-end">
                          <button
                            type="button"
                            onClick={() => removeSectionButton(index, bi)}
                            className={
                              bleed
                                ? "text-xs font-medium text-red-400 hover:text-red-300 hover:underline"
                                : "text-xs font-medium text-red-600 hover:text-red-800 hover:underline"
                            }
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(step.buttons ?? []).some((b) => b.label.trim() && (b.href || "").trim()) ? (
                  <div className="mt-6">
                    <p
                      className={
                        bleed ? "text-[11px] font-semibold uppercase tracking-wide text-zinc-400" : "text-[11px] font-semibold uppercase tracking-wide text-zinc-500"
                      }
                    >
                      Preview on page
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {(step.buttons ?? [])
                        .filter((b) => b.label.trim() && (b.href || "").trim())
                        .map((btn, pi) => {
                          const hr = btn.href.trim() || "#";
                          return (
                            <a
                              key={`preview-btn-${pi}-${btn.label.slice(0, 8)}`}
                              href={hr}
                              target={hr.startsWith("#") ? undefined : btn.newTab ? "_blank" : undefined}
                              rel={hr.startsWith("#") ? undefined : btn.newTab ? "noopener noreferrer" : undefined}
                              className={landingSectionBtnPreviewClass(btn.variant, bleed, ctaCorners)}
                            >
                              {btn.label.trim()}
                            </a>
                          );
                        })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <LandingResizeBar
              axis="y"
              layout="horizontalStrip"
              ariaLabel="Resize all funnel sections vertical padding"
              title="Adds space above/below body copy blocks (all funnel sections together)"
              getValue={() => theme.funnelSectionPaddingYPx ?? 48}
              clamp={[16, 160]}
              apply={(n) => patchTheme({ funnelSectionPaddingYPx: n })}
              onBegin={() => setEditorZone(`section-${index}` as LandingEditorZone)}
              className="relative z-20"
            />
          </section>
        );
      })}

      <div
        className={
          bleed
            ? "relative z-0 overflow-hidden border-t border-white/10 px-6 py-6 md:px-12"
            : "border-t border-zinc-100 bg-zinc-50 px-6 py-6 md:px-12"
        }
      >
        {bleed ? <LandingHeroBackdropStack theme={theme} /> : null}
        <div className={bleed ? "relative z-10" : undefined}>
          <button
            type="button"
            onClick={addFunnelStep}
            style={colSx}
            className={
              bleed
                ? `mx-auto flex w-full ${proseWrap} rounded-xl border-2 border-dashed border-white/25 bg-white/5 px-6 py-4 text-sm font-medium text-zinc-200 hover:border-violet-400/80 hover:bg-white/10 hover:text-white`
                : `mx-auto flex w-full ${proseWrap} rounded-xl border-2 border-dashed border-zinc-300 px-6 py-4 text-sm font-medium text-zinc-600 hover:border-violet-400 hover:bg-white hover:text-violet-900`
            }
          >
            + Add funnel section
          </button>
        </div>
      </div>

      {/* Image gallery */}
      <section
        id="lp-zone-gallery"
        className={
          bleed
            ? `relative z-0 overflow-hidden border-t border-white/10 px-6 py-12 text-white md:px-12 ${zoneRing(editorZone === "gallery")}`
            : `border-t border-zinc-200 bg-white px-6 py-12 md:px-12 ${zoneRing(editorZone === "gallery")}`
        }
        onFocusCapture={() => setEditorZone("gallery")}
        onPointerDownCapture={(e) => editableSurfaceClick(e, "gallery", setEditorZone)}
      >
        {bleed ? <LandingHeroBackdropStack theme={theme} /> : null}
        <div className={`relative z-10 mx-auto w-full ${galleryWrap}`} style={colSx}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className={`text-sm font-semibold uppercase tracking-wide ${bleed ? "text-zinc-400" : "text-zinc-500"}`}>
              Image gallery
            </h3>
            <button
              type="button"
              onClick={addGallery}
              className={bleed ? "text-xs font-medium text-violet-400 hover:underline" : "text-xs font-medium text-violet-700 hover:underline"}
            >
              + Add image
            </button>
          </div>
          <p className={`mt-1 text-xs ${bleed ? "text-zinc-500" : "text-zinc-400"}`}>
            Use https image URLs (or /site paths). Shown in a responsive grid above trust signals.
          </p>
          {galleryImages.length === 0 ? (
            <p className={`mt-6 text-sm ${bleed ? "text-zinc-400" : "text-zinc-400"}`}>
              No images yet — add photos, logo walls, or product shots.
            </p>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {galleryImages.map((img, i) => (
                <div
                  key={`gal-${i}`}
                  className={
                    bleed
                      ? "overflow-hidden rounded-xl border border-white/20 bg-black/35 shadow-sm shadow-black/30"
                      : "overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 shadow-sm"
                  }
                >
                  {img.url.trim() ? (
                    <div className="w-full shrink-0 overflow-hidden" style={landingGalleryThumbStyle(theme)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.alt || ""} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div
                      className={`flex w-full shrink-0 items-center justify-center text-xs ${bleed ? "text-zinc-400" : "text-zinc-400"}`}
                      style={landingGalleryThumbStyle(theme)}
                    >
                      Paste image URL
                    </div>
                  )}
                  <div className="space-y-2 p-3">
                    <input
                      value={img.url}
                      onChange={(e) => patchGalleryAt(i, { url: e.target.value })}
                      className={
                        bleed
                          ? "w-full rounded border border-white/25 bg-black/35 px-2 py-1 font-mono text-xs text-white placeholder:text-zinc-500"
                          : "w-full rounded border border-zinc-200 px-2 py-1 font-mono text-xs"
                      }
                      placeholder="https://..."
                    />
                    <input
                      value={img.alt ?? ""}
                      onChange={(e) => patchGalleryAt(i, { alt: e.target.value })}
                      className={
                        bleed
                          ? "w-full rounded border border-white/25 bg-black/35 px-2 py-1 text-xs text-white placeholder:text-zinc-500"
                          : "w-full rounded border border-zinc-200 px-2 py-1 text-xs"
                      }
                      placeholder="Alt text"
                    />
                    <input
                      value={img.caption ?? ""}
                      onChange={(e) => patchGalleryAt(i, { caption: e.target.value })}
                      className={
                        bleed
                          ? "w-full rounded border border-white/25 bg-black/35 px-2 py-1 text-xs text-white placeholder:text-zinc-500"
                          : "w-full rounded border border-zinc-200 px-2 py-1 text-xs"
                      }
                      placeholder="Caption (optional)"
                    />
                    <button type="button" onClick={() => removeGallery(i)} className={`text-xs ${bleed ? "text-red-400 hover:underline" : "text-red-600 hover:underline"}`}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <LandingResizeBar
            axis="y"
            layout="horizontalStrip"
            ariaLabel="Resize gallery thumbnail height"
            title="Stretch how tall gallery images appear"
            getValue={() => theme.galleryCardImageHeightPx ?? 160}
            clamp={[88, 420]}
            apply={(n) => patchTheme({ galleryCardImageHeightPx: n })}
            className={`relative z-20 ${galleryImages.length > 0 ? "mt-6" : "mt-4"}`}
            onBegin={() => setEditorZone("gallery")}
          />
        </div>
      </section>

      {/* Trust */}
      <section
        id="lp-zone-trust"
        className={
          bleed
            ? `relative z-0 overflow-hidden border-t border-white/10 px-6 py-12 text-white md:px-12 ${zoneRing(editorZone === "trust")}`
            : `border-t border-zinc-200 bg-white px-6 py-12 md:px-12 ${zoneRing(editorZone === "trust")}`
        }
        onFocusCapture={() => setEditorZone("trust")}
        onPointerDownCapture={(e) => editableSurfaceClick(e, "trust", setEditorZone)}
      >
        {bleed ? <LandingHeroBackdropStack theme={theme} /> : null}
        <div className={`relative z-10 mx-auto w-full ${proseWrap}`} style={colSx}>
          <h3 className={`text-center text-sm font-semibold uppercase tracking-wide ${bleed ? "text-zinc-400" : "text-zinc-500"}`}>
            Trust & credibility
          </h3>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {(pageData.trustSignals ?? []).length === 0 ? (
              <p className="text-sm text-zinc-400">Add signals below — they appear as chips.</p>
            ) : (
              (pageData.trustSignals ?? []).map((t, i) => (
                <span
                  key={`${i}-${t.slice(0, 24)}`}
                  className={
                    bleed
                      ? "rounded-full border px-4 py-2 text-sm font-medium text-white shadow-sm shadow-black/30"
                      : "rounded-full border bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm"
                  }
                  style={{
                    borderColor: normalizeHex(theme.accentHex, "#a78bfa"),
                    backgroundColor: bleed
                      ? `${normalizeHex(theme.primaryHex, "#6d28d9")}35`
                      : `${normalizeHex(theme.primaryHex, "#6d28d9")}10`,
                  }}
                >
                  {t}
                </span>
              ))
            )}
          </div>
          <label className="mt-8 block">
            <span className={`text-xs font-medium ${bleed ? "text-zinc-400" : "text-zinc-600"}`}>Edit signals (one per line)</span>
            <textarea
              value={(pageData.trustSignals ?? []).join("\n")}
              onChange={(e) =>
                setTrustSignalsFromLines(
                  e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
              rows={5}
              className={
                bleed
                  ? "mt-2 w-full rounded-xl border border-white/25 bg-black/35 px-4 py-3 text-sm text-white placeholder:text-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                  : "mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
              }
              placeholder={"ISO certified\n500+ happy clients"}
            />
          </label>
        </div>
      </section>

      {/* Lead form / scheduling embed scroll targets */}
      <section
        id="landing-book"
        className={
          bleed
            ? "scroll-mt-24 relative z-0 overflow-hidden border-t border-white/10 px-6 py-14 text-white md:px-12"
            : "scroll-mt-24 border-t border-zinc-200 bg-gradient-to-b from-zinc-50 to-white px-6 py-14 md:px-12"
        }
      >
        {bleed ? <LandingHeroBackdropStack theme={theme} /> : null}
        <div
          id="lp-zone-lead-form"
          className={`relative z-10 mx-auto w-full pr-12 ${editorZone === "embed" ? "rounded-3xl ring-2 ring-violet-400/75 ring-offset-4 ring-offset-transparent" : ""}`}
          style={{ maxWidth: embedMaxW }}
          onFocusCapture={() => setEditorZone("embed")}
          onPointerDownCapture={(e) => editableSurfaceClick(e, "embed", setEditorZone)}
        >
          <h3
            className={`text-center text-2xl font-bold ${bleed ? "text-white" : ""}`}
            style={bleed ? { fontFamily: resolveHeadingFont(theme) } : { fontFamily: resolveHeadingFont(theme), color: "var(--lp-primary)" }}
          >
            Lead capture
          </h3>
          <p className={`mt-2 text-center text-sm ${bleed ? "text-zinc-300" : "text-zinc-500"}`}>
            Paste your GoHighLevel or other embed — preview updates here (same as visitors will see when published).
          </p>
          {(pageData.formEmbedHtml ?? "").trim() ? (
            <div
              id="landing-form"
              className={`mt-8 shadow-inner ${embedCorners}`}
              style={{
                padding: embedOuterPadPx,
                boxSizing: "border-box",
                backgroundColor: normalizeHex(theme.formEmbedCardBgHex, "#ffffff"),
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: normalizeHex(theme.formEmbedCardBorderHex, "#e4e4e7"),
              }}
            >
              {/* Trusted agency-only editor context — mirrors published embed */}
              <div
                className={`landing-embed-preview overflow-hidden border border-zinc-100 bg-zinc-50/50 ${embedCorners}`}
                style={{
                  ...landingEmbedIframeVars(theme),
                }}
              >
                {/* eslint-disable-next-line react/no-danger */}
                <div dangerouslySetInnerHTML={{ __html: pageData.formEmbedHtml ?? "" }} />
              </div>
              <LandingEmbedResizeHandle
                theme={theme}
                patchTheme={patchTheme}
                onBeginResize={() => setEditorZone("embed")}
              />
              <p className="mt-2 text-center text-[10px] text-zinc-400">
                Drag the striped bar under the iframe for height; use the grip on the right for column width — then Save.
              </p>
            </div>
          ) : (
            <div
              id="landing-form"
              className={
                bleed
                  ? "mt-8 rounded-2xl border-2 border-dashed border-white/25 bg-black/35 px-8 py-16 text-center"
                  : "mt-8 rounded-2xl border-2 border-dashed border-zinc-200 bg-white px-8 py-16 text-center"
              }
            >
              <p className={bleed ? "text-sm text-zinc-300" : "text-sm text-zinc-500"}>
                No embed yet — paste HTML below.
              </p>
            </div>
          )}
          <details
            id="lp-zone-embed-html"
            className={
              bleed
                ? "group mt-6 rounded-xl border border-white/20 bg-black/35 open:border-violet-500/40 open:shadow-lg open:shadow-black/40"
                : "group mt-6 rounded-xl border border-zinc-200 bg-white open:shadow-md"
            }
          >
            <summary
              className={
                bleed
                  ? "cursor-pointer select-none px-4 py-3 text-sm font-medium text-zinc-200 hover:bg-white/5"
                  : "cursor-pointer select-none px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              }
            >
              Embed HTML
            </summary>
            <textarea
              value={pageData.formEmbedHtml ?? ""}
              onChange={(e) => updateField("formEmbedHtml", e.target.value)}
              rows={8}
              className={
                bleed
                  ? "w-full border-t border-white/10 bg-black/45 px-4 py-3 font-mono text-xs leading-relaxed text-white placeholder:text-zinc-500 focus:outline-none"
                  : "w-full border-t border-zinc-100 bg-zinc-50 px-4 py-3 font-mono text-xs leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
              }
              spellCheck={false}
              placeholder='<iframe src="https://..." ...></iframe>'
            />
          </details>
          <LandingResizeBar
            axis="x"
            layout="verticalThumb"
            ariaLabel="Resize lead-form column width"
            title="Narrow or widen embed column — switches to px"
            className="absolute right-0 top-24 z-30 h-[min(280px,45vh)] rounded-l-md rounded-r-none opacity-95"
            disabled={!(pageData.formEmbedHtml ?? "").trim()}
            getValue={() => embedColumnWidthPx(theme)}
            clamp={[280, 980]}
            apply={(n) => patchTheme({ formEmbedMaxWidth: `${n}px` })}
            onBegin={() => setEditorZone("embed")}
          />
        </div>
      </section>

      {/* Footer links */}
      <section
        id="lp-zone-footer"
        className={
          bleed
            ? `relative z-0 overflow-hidden border-t border-white/10 px-6 py-8 text-white md:px-12 ${zoneRing(editorZone === "footer")}`
            : `border-t border-zinc-200 bg-zinc-50 px-6 py-8 md:px-12 ${zoneRing(editorZone === "footer")}`
        }
        onFocusCapture={() => setEditorZone("footer")}
        onPointerDownCapture={(e) => editableSurfaceClick(e, "footer", setEditorZone)}
      >
        {bleed ? <LandingHeroBackdropStack theme={theme} /> : null}
        <div className={`relative z-10 mx-auto w-full ${proseWrap}`} style={colSx}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`text-xs font-semibold uppercase tracking-wide ${bleed ? "text-zinc-400" : "text-zinc-500"}`}>
              Footer / legal links
            </span>
            <button
              type="button"
              onClick={addFooter}
              className={bleed ? "text-xs font-medium text-violet-400 hover:underline" : "text-xs font-medium text-violet-700 hover:underline"}
            >
              + Add link
            </button>
          </div>
          {footerLinks.length === 0 ? (
            <p className={`mt-2 text-xs ${bleed ? "text-zinc-400" : "text-zinc-400"}`}>Optional — privacy, terms, contact.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {footerLinks.map((link, i) => (
                <div
                  key={`ft-${i}`}
                  className={
                    bleed
                      ? "flex flex-wrap items-end gap-2 rounded-lg border border-white/20 bg-black/35 p-2"
                      : "flex flex-wrap items-end gap-2 rounded-lg border border-zinc-200 bg-white p-2"
                  }
                >
                  <label className={`min-w-[8rem] flex-1 text-[11px] ${bleed ? "text-zinc-400" : "text-zinc-600"}`}>
                    Label
                    <input
                      value={link.label}
                      onChange={(e) => patchFooterAt(i, { label: e.target.value })}
                      className={
                        bleed
                          ? "mt-0.5 w-full rounded border border-white/25 bg-black/40 px-2 py-1 text-sm text-white"
                          : "mt-0.5 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                      }
                    />
                  </label>
                  <label className={`min-w-[10rem] flex-[2] text-[11px] ${bleed ? "text-zinc-400" : "text-zinc-600"}`}>
                    URL
                    <input
                      value={link.href}
                      onChange={(e) => patchFooterAt(i, { href: e.target.value })}
                      className={
                        bleed
                          ? "mt-0.5 w-full rounded border border-white/25 bg-black/40 px-2 py-1 font-mono text-xs text-white"
                          : "mt-0.5 w-full rounded border border-zinc-300 px-2 py-1 font-mono text-xs"
                      }
                    />
                  </label>
                  <label className={`flex items-center gap-1 text-[11px] ${bleed ? "text-zinc-400" : "text-zinc-600"}`}>
                    <input
                      type="checkbox"
                      checked={!!link.newTab}
                      onChange={(e) => patchFooterAt(i, { newTab: e.target.checked })}
                    />{" "}
                    New tab
                  </label>
                  <button
                    type="button"
                    onClick={() => removeFooter(i)}
                    className={`text-xs ${bleed ? "text-red-400 hover:underline" : "text-red-600 hover:underline"}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          {footerLinks.some((f) => f.label.trim() && f.href.trim()) ? (
            <div
              className={`mt-6 flex flex-wrap justify-center gap-4 pt-6 text-sm ${
                bleed ? "border-t border-white/15 text-zinc-200" : "border-t border-zinc-200 text-zinc-600"
              }`}
            >
              {footerLinks
                .filter((f) => f.label.trim() && f.href.trim())
                .map((f, i) => (
                  <a
                    key={`ft-a-${i}`}
                    href={f.href}
                    target={f.newTab ? "_blank" : undefined}
                    rel={f.newTab ? "noopener noreferrer" : undefined}
                    className={
                      bleed
                        ? "text-zinc-200 underline-offset-4 hover:text-white hover:underline"
                        : "hover:text-zinc-900 hover:underline"
                    }
                  >
                    {f.label}
                  </a>
                ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* FAQ */}
      <section
        id="lp-zone-faq"
        className={
          bleed
            ? `relative z-0 overflow-hidden border-t border-white/10 px-6 md:px-12 ${faqSp.className} text-white ${zoneRing(editorZone === "faq")}`
            : `border-t border-zinc-200 bg-white px-6 md:px-12 ${faqSp.className} ${zoneRing(editorZone === "faq")}`
        }
        style={faqSp.padStyle}
        onFocusCapture={() => setEditorZone("faq")}
        onPointerDownCapture={(e) => editableSurfaceClick(e, "faq", setEditorZone)}
      >
        {bleed ? <LandingHeroBackdropStack theme={theme} /> : null}
        <div className={`relative z-10 mx-auto w-full ${proseWrap}`} style={colSx}>
          <h3 className={`text-center text-sm font-semibold uppercase tracking-wide ${bleed ? "text-zinc-400" : "text-zinc-500"}`}>
            Questions
          </h3>
          <div className="mt-10 space-y-4">
            {(pageData.faq ?? []).length === 0 ? (
              <p className="text-center text-sm text-zinc-400">No FAQs yet — add pairs below.</p>
            ) : (
              (pageData.faq ?? []).map((item, i) => (
                <div
                  key={`faq-${i}`}
                  className={
                    bleed
                      ? "rounded-xl border border-white/15 bg-black/35 p-5 shadow-sm shadow-black/30"
                      : "rounded-xl border border-zinc-200 bg-zinc-50/40 p-5 shadow-sm"
                  }
                >
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeFaq(i)}
                      className={
                        bleed
                          ? "text-xs font-medium text-red-400 hover:underline"
                          : "text-xs font-medium text-red-600 hover:underline"
                      }
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    value={item.q ?? ""}
                    onChange={(e) => patchFaq(i, { q: e.target.value })}
                    placeholder="Question"
                    className={
                      bleed
                        ? "mt-1 w-full bg-transparent text-lg font-semibold text-white placeholder:text-zinc-500 focus:outline-none"
                        : "mt-1 w-full bg-transparent text-lg font-semibold placeholder:text-zinc-400 focus:outline-none"
                    }
                    style={
                      bleed
                        ? { fontFamily: resolveHeadingFont(theme) }
                        : { fontFamily: resolveHeadingFont(theme), color: "var(--lp-primary)" }
                    }
                  />
                  <textarea
                    value={item.a ?? ""}
                    onChange={(e) => patchFaq(i, { a: e.target.value })}
                    placeholder="Answer"
                    rows={3}
                    className={
                      bleed
                        ? "mt-3 w-full resize-none bg-transparent text-sm leading-relaxed text-zinc-200 placeholder:text-zinc-500 focus:outline-none"
                        : "mt-3 w-full resize-none bg-transparent text-sm leading-relaxed text-zinc-600 placeholder:text-zinc-400 focus:outline-none"
                    }
                  />
                </div>
              ))
            )}
            <button
              type="button"
              onClick={addFaq}
              className={
                bleed
                  ? "w-full rounded-xl border border-dashed border-white/35 py-3 text-sm font-medium text-zinc-200 hover:border-violet-400/80 hover:bg-white/10 hover:text-white"
                  : "w-full rounded-xl border border-dashed border-zinc-300 py-3 text-sm font-medium text-zinc-600 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-900"
              }
            >
              + Add FAQ
            </button>
          </div>
          <LandingResizeBar
            axis="y"
            layout="horizontalStrip"
            ariaLabel="Resize FAQ block vertical padding"
            title="Tight or spacious FAQ zone"
            getValue={() => theme.faqSectionPaddingYPx ?? 56}
            clamp={[24, 200]}
            apply={(n) => patchTheme({ faqSectionPaddingYPx: n })}
            className="relative z-20 mt-4"
            onBegin={() => setEditorZone("faq")}
          />
        </div>
      </section>

      {/* Thank you + SEO */}
      <section
        id="lp-zone-seo"
        className={
          bleed
            ? `relative z-0 overflow-hidden border-t border-white/10 px-6 py-14 text-white md:px-12 ${zoneRing(editorZone === "seo")}`
            : `border-t border-zinc-200 bg-zinc-900 px-6 py-14 text-zinc-100 md:px-12 ${zoneRing(editorZone === "seo")}`
        }
        onFocusCapture={() => setEditorZone("seo")}
        onPointerDownCapture={(e) => editableSurfaceClick(e, "seo", setEditorZone)}
      >
        {bleed ? <LandingHeroBackdropStack theme={theme} /> : null}
        <div className={`relative z-10 mx-auto w-full ${proseWrap} space-y-10`} style={colSx}>
          <div>
            <h3 className={`text-xs font-semibold uppercase tracking-wide ${bleed ? "text-zinc-400" : "text-zinc-500"}`}>
              After submit
            </h3>
            <textarea
              value={pageData.thankYouCopy ?? ""}
              onChange={(e) => updateField("thankYouCopy", e.target.value)}
              rows={4}
              placeholder="Thank-you message or next step after someone converts."
              className={
                bleed
                  ? "mt-3 w-full resize-none rounded-xl border border-white/20 bg-black/45 px-4 py-3 text-base leading-relaxed text-white placeholder:text-zinc-500 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  : "mt-3 w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950/80 px-4 py-3 text-base leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              }
            />
          </div>
          <div className={`grid gap-6 pt-10 md:grid-cols-2 ${bleed ? "border-t border-white/15" : "border-t border-zinc-800"}`}>
            <label className="block">
              <span className={`text-xs font-semibold uppercase tracking-wide ${bleed ? "text-zinc-400" : "text-zinc-500"}`}>
                SEO title
              </span>
              <input
                value={pageData.seoTitle ?? ""}
                onChange={(e) => updateField("seoTitle", e.target.value)}
                className={
                  bleed
                    ? "mt-2 w-full rounded-lg border border-white/20 bg-black/45 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-violet-400 focus:outline-none"
                    : "mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
                }
                placeholder="≤70 characters"
              />
            </label>
            <label className="block md:col-span-2">
              <span className={`text-xs font-semibold uppercase tracking-wide ${bleed ? "text-zinc-400" : "text-zinc-500"}`}>
                SEO description
              </span>
              <textarea
                value={pageData.seoDescription ?? ""}
                onChange={(e) => updateField("seoDescription", e.target.value)}
                rows={2}
                className={
                  bleed
                    ? "mt-2 w-full rounded-lg border border-white/20 bg-black/45 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-violet-400 focus:outline-none"
                    : "mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
                }
                placeholder="≤160 characters"
              />
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}
