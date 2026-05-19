import type { CSSProperties } from "react";
import type { LandingPageTheme } from "@/lib/api";

const FALLBACK_PRIMARY = "#5b21b6";
const FALLBACK_ACCENT = "#c4b5fd";

/** Preset stacks (no remote font loads — relies on visitor OS / future published CSS). */
export const FONT_PRESET_STACKS: Record<string, string> = {
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
  modern:
    '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
};

export function normalizeHex(hex: unknown, fallback: string): string {
  if (typeof hex !== "string" || !/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex.trim()))
    return fallback;
  return hex.trim().toLowerCase();
}

function resolvePresetStack(
  presetRaw: unknown,
  customCss: unknown,
  fallbackPreset: keyof typeof FONT_PRESET_STACKS
): string {
  const custom = typeof customCss === "string" ? customCss.trim().slice(0, 420) : "";
  if (custom) return custom;
  const p = typeof presetRaw === "string" ? presetRaw.trim().toLowerCase() : fallbackPreset;
  return FONT_PRESET_STACKS[p] ?? FONT_PRESET_STACKS[fallbackPreset];
}

export function resolveHeadingFont(theme?: LandingPageTheme | null): string {
  return resolvePresetStack(theme?.headingFontPreset, theme?.headingFontCss, "modern");
}

export function resolveBodyFont(theme?: LandingPageTheme | null): string {
  return resolvePresetStack(theme?.bodyFontPreset, theme?.bodyFontCss, "system");
}

/** Full-bleed: funnel bands + footer areas reuse hero backdrop layers when enabled in theme. */
export function landingBandsMatchHeroBackdrop(theme?: LandingPageTheme | null): boolean {
  if (!theme || theme.belowHeroBackdrop === "isolateHero") return false;
  return theme.belowHeroBackdrop === "matchHero";
}

/** CSS variables consumed by Tailwind-rich preview (editor only). */
export function landingDesignRootVars(theme?: LandingPageTheme | null): CSSProperties {
  const primary = normalizeHex(theme?.primaryHex, FALLBACK_PRIMARY);
  const accent = normalizeHex(theme?.accentHex, FALLBACK_ACCENT);
  const hFont = resolveHeadingFont(theme);
  const bFont = resolveBodyFont(theme);
  const r = theme?.cornerRadius;
  let radiusPx = "0.75rem";
  if (r === "square") radiusPx = "0.25rem";
  if (r === "pill") radiusPx = "9999px";
  const vars = {
    "--lp-primary": primary,
    "--lp-accent": accent,
    "--lp-radius": radiusPx,
    "--lp-font-heading": hFont,
    "--lp-font-body": bFont,
    ...(typeof theme?.previewRootFontSizePx === "number" && Number.isFinite(theme.previewRootFontSizePx)
      ? {
          fontSize: `${Math.min(22, Math.max(13, Math.round(theme.previewRootFontSizePx)))}px`,
        }
      : {}),
  } as CSSProperties;

  return vars;
}

const REM_EMBED_COL: Record<string, number> = {
  "28rem": 448,
  "36rem": 576,
  "48rem": 768,
  "64rem": 1024,
};

/** Max width constraint for prose-style columns (pixels). Drag handle updates `theme.contentColumnMaxWidthPx`. */
export function landingContentColumnStyle(theme?: LandingPageTheme | null): CSSProperties {
  const px = theme?.contentColumnMaxWidthPx;
  if (typeof px !== "number" || !Number.isFinite(px)) return {};
  const w = Math.min(1200, Math.max(300, Math.round(px)));
  return { maxWidth: `min(100%, ${w}px)` };
}

export function landingUsesCustomContentColumn(theme?: LandingPageTheme | null): boolean {
  return typeof theme?.contentColumnMaxWidthPx === "number" && Number.isFinite(theme.contentColumnMaxWidthPx);
}

/** Start value for dragging embed column width — mirrors `theme.formEmbedMaxWidth` strings. */
export function embedColumnWidthPx(theme?: LandingPageTheme | null): number {
  const raw = typeof theme?.formEmbedMaxWidth === "string" ? theme.formEmbedMaxWidth.trim() : "";
  if (!raw || raw === "100%") {
    const cw = Number(theme?.contentColumnMaxWidthPx);
    return Number.isFinite(cw) ? Math.min(920, Math.max(280, Math.round(cw))) : 576;
  }
  const pxMatch = /^(\d+(?:\.\d+)?)px$/i.exec(raw);
  if (pxMatch) return Math.round(Number(pxMatch[1]));
  const remMatch = /^(\d+(?:\.\d+)?)rem$/i.exec(raw);
  if (remMatch) return Math.round(Number(remMatch[1]) * 16);
  if (REM_EMBED_COL[raw]) return REM_EMBED_COL[raw];
  const bare = /^(\d+)$/.exec(raw);
  if (bare) return Math.min(920, Math.max(280, Number(bare[1])));
  return 576;
}

export function landingHeroSpacing(theme?: LandingPageTheme | null): { className: string; padStyle: CSSProperties } {
  const px = theme?.heroPaddingYPx;
  if (typeof px !== "number" || !Number.isFinite(px))
    return { className: "py-14 md:py-20", padStyle: {} };
  const p = Math.min(240, Math.max(32, Math.round(px)));
  return { className: "", padStyle: { paddingTop: p, paddingBottom: p } };
}

export function landingFunnelSectionSpacing(theme?: LandingPageTheme | null): {
  className: string;
  padStyle: CSSProperties;
} {
  const px = theme?.funnelSectionPaddingYPx;
  if (typeof px !== "number" || !Number.isFinite(px)) return { className: "py-12", padStyle: {} };
  const pPad = Math.min(160, Math.max(16, Math.round(px)));
  return { className: "", padStyle: { paddingTop: pPad, paddingBottom: pPad } };
}

export function landingFaqSpacing(theme?: LandingPageTheme | null): { className: string; padStyle: CSSProperties } {
  const px = theme?.faqSectionPaddingYPx;
  if (typeof px !== "number" || !Number.isFinite(px)) return { className: "py-14", padStyle: {} };
  const p = Math.min(200, Math.max(24, Math.round(px)));
  return { className: "", padStyle: { paddingTop: p, paddingBottom: p } };
}

/** Gallery thumbnail area height inside each card */
export function landingGalleryThumbStyle(theme?: LandingPageTheme | null): CSSProperties {
  const h = theme?.galleryCardImageHeightPx;
  if (typeof h !== "number" || !Number.isFinite(h)) return { height: "10rem" };
  const hh = Math.min(420, Math.max(88, Math.round(h)));
  return { height: `${hh}px` };
}

/** CSS variables for iframe dimensions inside `.landing-embed-preview` (see globals.css). */
export function landingEmbedIframeVars(theme?: LandingPageTheme | null): CSSProperties {
  const minPx = Number(theme?.formEmbedIframeMinHeightPx);
  const maxPx = Number(theme?.formEmbedIframeMaxHeightPx);
  const minV = Number.isFinite(minPx) ? Math.min(960, Math.max(120, minPx)) : 260;
  const maxV = Number.isFinite(maxPx) ? Math.min(1200, Math.max(200, maxPx)) : 720;
  const lo = Math.min(minV, maxV);
  const hi = Math.max(minV, maxV);
  return {
    "--lp-embed-iframe-min": `${lo}px`,
    "--lp-embed-iframe-max": `${hi}px`,
  } as CSSProperties;
}

/** Primary CTA / chip rounding class for preview chrome. */
export function cornerRoundingClass(corner?: string): string {
  if (corner === "square") return "rounded-md";
  if (corner === "pill") return "rounded-full";
  return "rounded-xl";
}
