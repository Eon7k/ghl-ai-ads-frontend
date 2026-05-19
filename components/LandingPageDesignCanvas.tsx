"use client";

import type { Dispatch, SetStateAction, SyntheticEvent } from "react";
import { useMemo } from "react";
import type { LandingEditorZone } from "@/components/LandingPageEditorInspector";
import type { LandingFunnelStep, LandingPageData, LandingGalleryImage, LandingNavLinkRow, LandingPageTheme } from "@/lib/api";
import {
  cornerRoundingClass,
  landingDesignRootVars,
  landingEmbedIframeVars,
  normalizeHex,
  resolveBodyFont,
  resolveHeadingFont,
} from "@/lib/landingPageTheme";

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
  if (t.closest('input:not([type="checkbox"]):not([type="radio"]), textarea, select, button, a, summary'))
    return;
  setZone(zone);
}

function zoneRing(active: boolean) {
  return active ? "ring-2 ring-violet-400/75 ring-offset-2 ring-offset-white" : "";
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
  const heroBgRaw = theme.heroBgImageUrl?.trim() ?? "";
  const ctaCorners = cornerRoundingClass(theme.cornerRadius);
  const embedCorners = cornerRoundingClass(theme.formEmbedCardRadius ?? theme.cornerRadius);
  const embedMaxW = theme.formEmbedMaxWidth?.trim() || "36rem";
  const embedOuterPadPx = theme.formEmbedOuterPaddingPx ?? 24;

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

  return (
    <div
      className="landing-design-root rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-200/60 ring-1 ring-black/5"
      style={{ ...landingDesignRootVars(theme), fontFamily: resolveBodyFont(theme) }}
    >
      <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Design preview — click Save to persist changes</p>
        <p className="mt-1 text-[11px] leading-snug text-zinc-400">
          A funnel step with key <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-[10px] text-zinc-700">hero</code> matches
          the headline area above and is not repeated in the sections list.
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
        </div>
      </details>

      <div
        id="lp-zone-nav-editor"
        className={`border-b border-zinc-200 bg-white px-4 py-3 ${zoneRing(editorZone === "nav")}`}
        onFocusCapture={() => setEditorZone("nav")}
        onPointerDownCapture={(e) => editableSurfaceClick(e, "nav", setEditorZone)}
      >
        <div className="mx-auto flex max-w-4xl flex-col gap-2">
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
        className={`relative overflow-hidden px-6 py-14 text-white md:px-12 md:py-20 ${zoneRing(editorZone === "hero")}`}
        onFocusCapture={() => setEditorZone("hero")}
        onPointerDownCapture={(e) => editableSurfaceClick(e, "hero", setEditorZone)}
      >
        <div className="absolute inset-0 bg-zinc-950" />
        {heroBgRaw ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${heroBgRaw})` }}
            />
            <div
              className="absolute inset-0 bg-black"
              style={{
                opacity: Math.min(0.95, Math.max(0, theme.heroOverlayOpacity ?? 0.55)),
              }}
            />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0 opacity-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${normalizeHex(theme.primaryHex, "#5b21b6")} 0%, #27272a 46%, #0c0a12 100%)`,
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.16),transparent_58%)]" />
          </>
        )}
        <div className="relative mx-auto max-w-3xl" style={{ fontFamily: resolveBodyFont(theme) }}>
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
                placeholder="https://… or /thank-you"
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
        </div>
      </section>

      {/* Funnel sections */}
      {funnelIndexes.map(({ step, index }, visualRank) => {
        const zebra = visualRank % 2 === 0;
        return (
          <section
            key={`${step.key ?? "step"}-${index}`}
            id={`lp-zone-section-${index}`}
            className={`border-t border-zinc-100 px-6 py-12 md:px-12 ${zebra ? "bg-white" : "bg-zinc-50/90"} ${zoneRing(editorZone === `section-${index}`)}`}
            onFocusCapture={() => setEditorZone(`section-${index}`)}
            onPointerDownCapture={(e) => editableSurfaceClick(e, `section-${index}` as LandingEditorZone, setEditorZone)}
          >
            <div className="mx-auto max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-md bg-violet-100 px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide text-violet-800">
                  {(step.key ?? "").trim() || `section-${visualRank + 1}`}
                </span>
                <button
                  type="button"
                  onClick={() => removeFunnelStep(index)}
                  className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline"
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
                  className="w-full resize-none bg-transparent text-2xl font-semibold tracking-tight text-zinc-900 placeholder:text-zinc-400 focus:outline-none md:text-3xl"
                  style={{ fontFamily: resolveHeadingFont(theme) }}
                />
              </label>
              <label className="mt-5 block">
                <span className="sr-only">Section body</span>
                <textarea
                  value={step.body ?? ""}
                  onChange={(e) => patchFunnelStep(index, { body: e.target.value })}
                  rows={Math.min(14, Math.max(4, (step.body ?? "").split("\n").length || 4))}
                  placeholder="Paragraphs for this section."
                  className="w-full resize-none bg-transparent text-base leading-relaxed text-zinc-600 placeholder:text-zinc-400 focus:outline-none"
                  style={{ fontFamily: resolveBodyFont(theme) }}
                />
              </label>
              <div className="mt-6 rounded-xl border border-dashed border-zinc-200 bg-white/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Bullet points</p>
                <p className="mt-1 text-xs text-zinc-400">One line per bullet — shown as a list below.</p>
                {(step.bullets?.length ?? 0) > 0 ? (
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-zinc-700 marker:text-[color:var(--lp-accent)]">
                    {(step.bullets ?? []).map((b, bi) => (
                      <li key={`${bi}-${b.slice(0, 16)}`}>{b}</li>
                    ))}
                  </ul>
                ) : null}
                <textarea
                  value={(step.bullets ?? []).join("\n")}
                  onChange={(e) => setStepBullets(index, e.target.value)}
                  rows={4}
                  className="mt-4 w-full rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                  placeholder={"Outcome one\nOutcome two"}
                />
              </div>
            </div>
          </section>
        );
      })}

      <div className="border-t border-zinc-100 bg-zinc-50 px-6 py-6 md:px-12">
        <button
          type="button"
          onClick={addFunnelStep}
          className="mx-auto flex max-w-3xl rounded-xl border-2 border-dashed border-zinc-300 px-6 py-4 text-sm font-medium text-zinc-600 hover:border-violet-400 hover:bg-white hover:text-violet-900"
        >
          + Add funnel section
        </button>
      </div>

      {/* Image gallery */}
      <section
        id="lp-zone-gallery"
        className={`border-t border-zinc-200 bg-white px-6 py-12 md:px-12 ${zoneRing(editorZone === "gallery")}`}
        onFocusCapture={() => setEditorZone("gallery")}
        onPointerDownCapture={(e) => editableSurfaceClick(e, "gallery", setEditorZone)}
      >
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Image gallery</h3>
            <button type="button" onClick={addGallery} className="text-xs font-medium text-violet-700 hover:underline">
              + Add image
            </button>
          </div>
          <p className="mt-1 text-xs text-zinc-400">Use https image URLs (or /site paths). Shown in a responsive grid above trust signals.</p>
          {galleryImages.length === 0 ? (
            <p className="mt-6 text-sm text-zinc-400">No images yet — add photos, logo walls, or product shots.</p>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {galleryImages.map((img, i) => (
                <div key={`gal-${i}`} className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 shadow-sm">
                  {img.url.trim() ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.url} alt={img.alt || ""} className="h-40 w-full object-cover" />
                  ) : (
                    <div className="flex h-40 items-center justify-center text-xs text-zinc-400">Paste image URL</div>
                  )}
                  <div className="space-y-2 p-3">
                    <input
                      value={img.url}
                      onChange={(e) => patchGalleryAt(i, { url: e.target.value })}
                      className="w-full rounded border border-zinc-200 px-2 py-1 font-mono text-xs"
                      placeholder="https://..."
                    />
                    <input
                      value={img.alt ?? ""}
                      onChange={(e) => patchGalleryAt(i, { alt: e.target.value })}
                      className="w-full rounded border border-zinc-200 px-2 py-1 text-xs"
                      placeholder="Alt text"
                    />
                    <input
                      value={img.caption ?? ""}
                      onChange={(e) => patchGalleryAt(i, { caption: e.target.value })}
                      className="w-full rounded border border-zinc-200 px-2 py-1 text-xs"
                      placeholder="Caption (optional)"
                    />
                    <button type="button" onClick={() => removeGallery(i)} className="text-xs text-red-600 hover:underline">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trust */}
      <section
        id="lp-zone-trust"
        className={`border-t border-zinc-200 bg-white px-6 py-12 md:px-12 ${zoneRing(editorZone === "trust")}`}
        onFocusCapture={() => setEditorZone("trust")}
        onPointerDownCapture={(e) => editableSurfaceClick(e, "trust", setEditorZone)}
      >
        <div className="mx-auto max-w-3xl">
          <h3 className="text-center text-sm font-semibold uppercase tracking-wide text-zinc-500">Trust & credibility</h3>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {(pageData.trustSignals ?? []).length === 0 ? (
              <p className="text-sm text-zinc-400">Add signals below — they appear as chips.</p>
            ) : (
              (pageData.trustSignals ?? []).map((t, i) => (
                <span
                  key={`${i}-${t.slice(0, 24)}`}
                  className="rounded-full border bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm"
                  style={{
                    borderColor: normalizeHex(theme.accentHex, "#a78bfa"),
                    backgroundColor: `${normalizeHex(theme.primaryHex, "#6d28d9")}10`,
                  }}
                >
                  {t}
                </span>
              ))
            )}
          </div>
          <label className="mt-8 block">
            <span className="text-xs font-medium text-zinc-600">Edit signals (one per line)</span>
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
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
              placeholder={"ISO certified\n500+ happy clients"}
            />
          </label>
        </div>
      </section>

      {/* Lead form */}
      <section className="border-t border-zinc-200 bg-gradient-to-b from-zinc-50 to-white px-6 py-14 md:px-12">
        <div
          id="lp-zone-lead-form"
          className={`mx-auto w-full ${editorZone === "embed" ? "rounded-3xl ring-2 ring-violet-400/75 ring-offset-4 ring-offset-transparent" : ""}`}
          style={{ maxWidth: embedMaxW }}
          onFocusCapture={() => setEditorZone("embed")}
          onPointerDownCapture={(e) => editableSurfaceClick(e, "embed", setEditorZone)}
        >
          <h3 className="text-center text-2xl font-bold text-zinc-900">Lead capture</h3>
          <p className="mt-2 text-center text-sm text-zinc-500">
            Paste your GoHighLevel or other embed — preview updates here (same as visitors will see when published).
          </p>
          {(pageData.formEmbedHtml ?? "").trim() ? (
            <div
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
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border-2 border-dashed border-zinc-200 bg-white px-8 py-16 text-center">
              <p className="text-sm text-zinc-500">No embed yet — paste HTML below.</p>
            </div>
          )}
          <details id="lp-zone-embed-html" className="group mt-6 rounded-xl border border-zinc-200 bg-white open:shadow-md">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              Embed HTML
            </summary>
            <textarea
              value={pageData.formEmbedHtml ?? ""}
              onChange={(e) => updateField("formEmbedHtml", e.target.value)}
              rows={8}
              className="w-full border-t border-zinc-100 bg-zinc-50 px-4 py-3 font-mono text-xs leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
              spellCheck={false}
              placeholder='<iframe src="https://..." ...></iframe>'
            />
          </details>
        </div>
      </section>

      {/* Footer links */}
      <section
        id="lp-zone-footer"
        className={`border-t border-zinc-200 bg-zinc-50 px-6 py-8 md:px-12 ${zoneRing(editorZone === "footer")}`}
        onFocusCapture={() => setEditorZone("footer")}
        onPointerDownCapture={(e) => editableSurfaceClick(e, "footer", setEditorZone)}
      >
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Footer / legal links</span>
            <button type="button" onClick={addFooter} className="text-xs font-medium text-violet-700 hover:underline">
              + Add link
            </button>
          </div>
          {footerLinks.length === 0 ? (
            <p className="mt-2 text-xs text-zinc-400">Optional — privacy, terms, contact.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {footerLinks.map((link, i) => (
                <div key={`ft-${i}`} className="flex flex-wrap items-end gap-2 rounded-lg border border-zinc-200 bg-white p-2">
                  <label className="min-w-[8rem] flex-1 text-[11px] text-zinc-600">
                    Label
                    <input
                      value={link.label}
                      onChange={(e) => patchFooterAt(i, { label: e.target.value })}
                      className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="min-w-[10rem] flex-[2] text-[11px] text-zinc-600">
                    URL
                    <input
                      value={link.href}
                      onChange={(e) => patchFooterAt(i, { href: e.target.value })}
                      className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1 font-mono text-xs"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-[11px] text-zinc-600">
                    <input
                      type="checkbox"
                      checked={!!link.newTab}
                      onChange={(e) => patchFooterAt(i, { newTab: e.target.checked })}
                    />{" "}
                    New tab
                  </label>
                  <button type="button" onClick={() => removeFooter(i)} className="text-xs text-red-600 hover:underline">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          {footerLinks.some((f) => f.label.trim() && f.href.trim()) ? (
            <div className="mt-6 flex flex-wrap justify-center gap-4 border-t border-zinc-200 pt-6 text-sm text-zinc-600">
              {footerLinks
                .filter((f) => f.label.trim() && f.href.trim())
                .map((f, i) => (
                  <a
                    key={`ft-a-${i}`}
                    href={f.href}
                    target={f.newTab ? "_blank" : undefined}
                    rel={f.newTab ? "noopener noreferrer" : undefined}
                    className="hover:text-zinc-900 hover:underline"
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
        className={`border-t border-zinc-200 bg-white px-6 py-14 md:px-12 ${zoneRing(editorZone === "faq")}`}
        onFocusCapture={() => setEditorZone("faq")}
        onPointerDownCapture={(e) => editableSurfaceClick(e, "faq", setEditorZone)}
      >
        <div className="mx-auto max-w-3xl">
          <h3 className="text-center text-sm font-semibold uppercase tracking-wide text-zinc-500">Questions</h3>
          <div className="mt-10 space-y-4">
            {(pageData.faq ?? []).length === 0 ? (
              <p className="text-center text-sm text-zinc-400">No FAQs yet — add pairs below.</p>
            ) : (
              (pageData.faq ?? []).map((item, i) => (
                <div key={`faq-${i}`} className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-5 shadow-sm">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeFaq(i)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    value={item.q ?? ""}
                    onChange={(e) => patchFaq(i, { q: e.target.value })}
                    placeholder="Question"
                    className="mt-1 w-full bg-transparent text-lg font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                  />
                  <textarea
                    value={item.a ?? ""}
                    onChange={(e) => patchFaq(i, { a: e.target.value })}
                    placeholder="Answer"
                    rows={3}
                    className="mt-3 w-full resize-none bg-transparent text-sm leading-relaxed text-zinc-600 placeholder:text-zinc-400 focus:outline-none"
                  />
                </div>
              ))
            )}
            <button
              type="button"
              onClick={addFaq}
              className="w-full rounded-xl border border-dashed border-zinc-300 py-3 text-sm font-medium text-zinc-600 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-900"
            >
              + Add FAQ
            </button>
          </div>
        </div>
      </section>

      {/* Thank you + SEO */}
      <section
        id="lp-zone-seo"
        className={`border-t border-zinc-200 bg-zinc-900 px-6 py-14 text-zinc-100 md:px-12 ${zoneRing(editorZone === "seo")}`}
        onFocusCapture={() => setEditorZone("seo")}
        onPointerDownCapture={(e) => editableSurfaceClick(e, "seo", setEditorZone)}
      >
        <div className="mx-auto max-w-3xl space-y-10">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">After submit</h3>
            <textarea
              value={pageData.thankYouCopy ?? ""}
              onChange={(e) => updateField("thankYouCopy", e.target.value)}
              rows={4}
              placeholder="Thank-you message or next step after someone converts."
              className="mt-3 w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950/80 px-4 py-3 text-base leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
          </div>
          <div className="grid gap-6 border-t border-zinc-800 pt-10 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">SEO title</span>
              <input
                value={pageData.seoTitle ?? ""}
                onChange={(e) => updateField("seoTitle", e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
                placeholder="≤70 characters"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">SEO description</span>
              <textarea
                value={pageData.seoDescription ?? ""}
                onChange={(e) => updateField("seoDescription", e.target.value)}
                rows={2}
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
                placeholder="≤160 characters"
              />
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}
