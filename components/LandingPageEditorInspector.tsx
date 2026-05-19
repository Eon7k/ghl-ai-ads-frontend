"use client";

import type { LandingPageTheme } from "@/lib/api";
import { normalizeHex } from "@/lib/landingPageTheme";

export type LandingEditorZone =
  | null
  | "look"
  | "nav"
  | "hero"
  | `section-${number}`
  | "gallery"
  | "trust"
  | "embed"
  | "footer"
  | "faq"
  | "seo";

type Props = {
  zone: LandingEditorZone;
  onClearZone: () => void;
  onJumpToLook: () => void;
  theme: LandingPageTheme;
  patchTheme: (patch: Partial<LandingPageTheme>) => void;
  scrollToZoneId: (id: string) => void;
};

const EMBED_WIDTH_PRESETS: { label: string; value: string }[] = [
  { label: "Narrow (28rem)", value: "28rem" },
  { label: "Medium (36rem)", value: "36rem" },
  { label: "Wide (48rem)", value: "48rem" },
  { label: "Extra wide (64rem)", value: "64rem" },
  { label: "Full width", value: "100%" },
];

function zoneTitle(z: LandingEditorZone): string {
  if (!z) return "";
  if (z === "look") return "Global look & feel";
  if (z === "nav") return "Top navigation";
  if (z === "hero") return "Hero";
  if (z === "gallery") return "Image gallery";
  if (z === "trust") return "Trust chips";
  if (z === "embed") return "Lead form embed";
  if (z === "footer") return "Footer links";
  if (z === "faq") return "FAQ";
  if (z === "seo") return "SEO & thank-you";
  if (z.startsWith("section-")) {
    const n = Number(z.replace("section-", ""));
    const label = Number.isFinite(n) ? n + 1 : z.replace("section-", "");
    return `Funnel section ${label}`;
  }
  return "";
}

/** Sticky contextual controls — pairs with click/focus zones in the canvas preview. */
export default function LandingPageEditorInspector({
  zone,
  onClearZone,
  onJumpToLook,
  theme,
  patchTheme,
  scrollToZoneId,
}: Props) {
  return (
    <aside className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Inspector</p>
          <h3 className="mt-1 text-sm font-semibold text-zinc-900">{zone ? zoneTitle(zone) : "Nothing selected"}</h3>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => scrollToZoneId("lp-zone-look-feel")}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Colours / fonts
          </button>
          {zone ? (
            <button type="button" onClick={onClearZone} className="text-[11px] text-violet-700 hover:underline">
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {!zone ? (
        <p className="mt-3 text-xs leading-relaxed text-zinc-600">
          Tip: <strong className="font-medium text-zinc-800">Violet stripes</strong> on blocks resize spacing, typography, gallery photo height, embed height &amp; column width,
          FAQ padding, and main column width on the hero. Or click empty chrome / focus fields to inspect a zone. Use{" "}
          <span className="font-medium">Colours / fonts</span> for palette and font stacks. Save when done.
        </p>
      ) : null}

      {(zone === "look" || zone === "hero") && (
        <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4">
          <p className="text-xs font-medium text-zinc-800">Global appearance</p>
          <button type="button" onClick={onJumpToLook} className="w-full rounded-lg bg-violet-600 py-2 text-xs font-medium text-white hover:bg-violet-700">
            Open look &amp; feel panel
          </button>
          {zone === "hero" ? (
            <>
              <label className="block text-[11px] text-zinc-600">
                Hero photo darken (when a hero image URL is set, 0–90%)
                <input
                  type="range"
                  min={0}
                  max={90}
                  value={Math.round((theme.heroOverlayOpacity ?? 0.55) * 100)}
                  onChange={(e) => patchTheme({ heroOverlayOpacity: Number(e.target.value) / 100 })}
                  className="mt-2 w-full accent-violet-600"
                />
                <span className="text-[10px] text-zinc-500">{Math.round((theme.heroOverlayOpacity ?? 0.55) * 100)}%</span>
              </label>
            </>
          ) : null}
        </div>
      )}

      {zone === "nav" && (
        <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-xs text-zinc-600">
          <p>Edit link rows in the palette above the hero preview.</p>
          <button
            type="button"
            onClick={() => scrollToZoneId("lp-zone-nav-editor")}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-[11px] font-medium hover:bg-zinc-50"
          >
            Jump to navigation editor
          </button>
        </div>
      )}

      {zone === "gallery" && (
        <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-xs text-zinc-600">
          <p>Edit image URLs and captions directly in each card below.</p>
          <button
            type="button"
            onClick={() => scrollToZoneId("lp-zone-gallery")}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-[11px] font-medium hover:bg-zinc-50"
          >
            Jump to gallery
          </button>
        </div>
      )}

      {zone === "trust" && (
        <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-xs text-zinc-600">
          <p>Use one line per chip; colours inherit from accent / primary in look &amp; feel.</p>
          <button
            type="button"
            onClick={() => scrollToZoneId("lp-zone-trust")}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-[11px] font-medium hover:bg-zinc-50"
          >
            Jump to trust section
          </button>
        </div>
      )}

      {zone === "footer" && (
        <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-xs text-zinc-600">
          <p>Edit footer links in the block above FAQ.</p>
          <button
            type="button"
            onClick={() => scrollToZoneId("lp-zone-footer")}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-[11px] font-medium hover:bg-zinc-50"
          >
            Jump to footer links
          </button>
        </div>
      )}

      {zone === "faq" && (
        <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-xs text-zinc-600">
          <p>Expand each Q&amp;A pair in the canvas — add or remove rows there.</p>
          <button
            type="button"
            onClick={() => scrollToZoneId("lp-zone-faq")}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-[11px] font-medium hover:bg-zinc-50"
          >
            Jump to FAQ
          </button>
        </div>
      )}

      {zone === "seo" && (
        <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-xs text-zinc-600">
          <p>SEO title/description and thank-you copy sit at the bottom of the funnel preview.</p>
          <button
            type="button"
            onClick={() => scrollToZoneId("lp-zone-seo")}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-[11px] font-medium hover:bg-zinc-50"
          >
            Jump to SEO panel
          </button>
        </div>
      )}

      {zone === "embed" && (
        <div className="mt-4 space-y-4 border-t border-zinc-100 pt-4">
          <p className="text-[11px] leading-relaxed text-zinc-500">
            Resize the live preview quickly by dragging the horizontal bar directly under the embed in the canvas (or edit the pixel fields below).
          </p>
          <p className="text-xs font-medium text-zinc-800">Embed frame</p>
          <label className="block text-[11px] text-zinc-600">
            Column max width
            <select
              value={EMBED_WIDTH_PRESETS.some((p) => p.value === (theme.formEmbedMaxWidth ?? "36rem")) ? (theme.formEmbedMaxWidth ?? "36rem") : "custom"}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "custom") return;
                patchTheme({ formEmbedMaxWidth: v });
              }}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2 text-xs"
            >
              {EMBED_WIDTH_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
              <option value="custom">Custom (use field below)</option>
            </select>
          </label>
          <label className="block text-[11px] text-zinc-600">
            Custom max-width (CSS, e.g. 520px or 90vw)
            <input
              value={
                EMBED_WIDTH_PRESETS.some((p) => p.value === (theme.formEmbedMaxWidth ?? "36rem"))
                  ? ""
                  : (theme.formEmbedMaxWidth ?? "")
              }
              onChange={(e) => patchTheme({ formEmbedMaxWidth: e.target.value.trim() || undefined })}
              placeholder="520px"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2 font-mono text-xs"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[11px] text-zinc-600">
              Min iframe height (px)
              <input
                type="number"
                min={120}
                max={960}
                value={theme.formEmbedIframeMinHeightPx ?? 260}
                onChange={(e) => patchTheme({ formEmbedIframeMinHeightPx: Math.min(960, Math.max(120, Number(e.target.value) || 260)) })}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2 text-xs"
              />
            </label>
            <label className="block text-[11px] text-zinc-600">
              Max iframe height (px)
              <input
                type="number"
                min={200}
                max={1200}
                value={theme.formEmbedIframeMaxHeightPx ?? 720}
                onChange={(e) => patchTheme({ formEmbedIframeMaxHeightPx: Math.min(1200, Math.max(200, Number(e.target.value) || 720)) })}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2 text-xs"
              />
            </label>
          </div>

          <label className="block text-[11px] text-zinc-600">
            Outer padding (px)
            <input
              type="number"
              min={0}
              max={96}
              value={theme.formEmbedOuterPaddingPx ?? 24}
              onChange={(e) => patchTheme({ formEmbedOuterPaddingPx: Math.min(96, Math.max(0, Number(e.target.value) || 0)) })}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2 text-xs"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[11px] text-zinc-600">
              Card background
              <div className="mt-1 flex gap-2">
                <input
                  type="color"
                  value={normalizeHex(theme.formEmbedCardBgHex ?? "#ffffff", "#ffffff")}
                  onChange={(e) => patchTheme({ formEmbedCardBgHex: e.target.value })}
                  className="h-9 w-11 cursor-pointer rounded border border-zinc-300"
                />
                <input
                  value={theme.formEmbedCardBgHex ?? "#ffffff"}
                  onChange={(e) => patchTheme({ formEmbedCardBgHex: e.target.value })}
                  className="min-w-0 flex-1 rounded border border-zinc-300 px-2 py-1 font-mono text-[10px]"
                />
              </div>
            </label>
            <label className="block text-[11px] text-zinc-600">
              Card border
              <div className="mt-1 flex gap-2">
                <input
                  type="color"
                  value={normalizeHex(theme.formEmbedCardBorderHex ?? "#e4e4e7", "#e4e4e7")}
                  onChange={(e) => patchTheme({ formEmbedCardBorderHex: e.target.value })}
                  className="h-9 w-11 cursor-pointer rounded border border-zinc-300"
                />
                <input
                  value={theme.formEmbedCardBorderHex ?? "#e4e4e7"}
                  onChange={(e) => patchTheme({ formEmbedCardBorderHex: e.target.value })}
                  className="min-w-0 flex-1 rounded border border-zinc-300 px-2 py-1 font-mono text-[10px]"
                />
              </div>
            </label>
          </div>

          <label className="block text-[11px] text-zinc-600">
            Card corners
            <select
              value={theme.formEmbedCardRadius ?? "inherit"}
              onChange={(e) => patchTheme({
                formEmbedCardRadius:
                  e.target.value === "inherit" ? undefined : (e.target.value as LandingPageTheme["formEmbedCardRadius"]),
              })}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2 text-xs"
            >
              <option value="inherit">Same as global corner style</option>
              <option value="square">Square</option>
              <option value="rounded">Rounded</option>
              <option value="pill">Pill</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => scrollToZoneId("lp-zone-lead-form")}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-[11px] font-medium hover:bg-zinc-50"
          >
            Jump to embed in preview
          </button>
          <button
            type="button"
            onClick={() => scrollToZoneId("lp-zone-embed-html")}
            className="w-full rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] font-medium text-violet-900 hover:bg-violet-100"
          >
            Jump to raw HTML textarea
          </button>
        </div>
      )}

      {zone?.startsWith("section-") ? (
        <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4 text-xs text-zinc-600">
          <p className="text-zinc-700">Edit title, body, and bullets directly on the canvas. Per-section typography in the Inspector is planned; use global fonts in look &amp; feel.</p>
        </div>
      ) : null}
    </aside>
  );
}
