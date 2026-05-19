"use client";

import type { LandingPageTheme } from "@/lib/api";
import { normalizeHex } from "@/lib/landingPageTheme";

/**
 * Matches the hero’s background stack (solid base, optional remote image, darken overlay —
 * otherwise brand gradient). Used behind funnel rows and bands when theme extends hero backdrop.
 */
export default function LandingHeroBackdropStack({ theme }: { theme: LandingPageTheme }) {
  const url = typeof theme.heroBgImageUrl === "string" ? theme.heroBgImageUrl.trim() : "";
  const overlay = Math.min(0.95, Math.max(0, theme.heroOverlayOpacity ?? 0.55));
  const primaryHex = normalizeHex(theme.primaryHex, "#5b21b6");

  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-zinc-950" aria-hidden />
      {url ? (
        <>
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${url})` }}
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: overlay }} aria-hidden />
        </>
      ) : (
        <>
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${primaryHex} 0%, #27272a 46%, #0c0a12 100%)`,
            }}
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.16),transparent_58%)]" aria-hidden />
        </>
      )}
    </>
  );
}
