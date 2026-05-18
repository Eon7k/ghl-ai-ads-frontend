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
  } as CSSProperties;

  return vars;
}

/** Primary CTA / chip rounding class for preview chrome. */
export function cornerRoundingClass(corner?: string): string {
  if (corner === "square") return "rounded-md";
  if (corner === "pill") return "rounded-full";
  return "rounded-xl";
}
