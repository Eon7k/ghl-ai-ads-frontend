"use client";

import { useCallback, useRef, type PointerEvent } from "react";
import type { LandingPageTheme } from "@/lib/api";

function clampLooseHeight(n: number, lo: number, hi: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

type Props = {
  theme: LandingPageTheme;
  patchTheme: (patch: Partial<LandingPageTheme>) => void;
  /** When empty embed, callers should hide this. */
  disabled?: boolean;
  /** Selecting the embed zone when user grabs the handle. */
  onBeginResize?: () => void;
};

/**
 * Drag vertically to grow/shrink the GHL iframe preview.
 * Applies to `theme.formEmbedIframeMinHeightPx` / `formEmbedIframeMaxHeightPx`
 * together so min-height and max-height move in sync (maintains slack between them).
 */
export default function LandingEmbedResizeHandle({
  theme,
  patchTheme,
  disabled,
  onBeginResize,
}: Props) {
  const sessionRef = useRef<{ startY: number; startMin: number; startSpan: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  const flushPatch = useCallback(
    (minPx: number, maxPx: number) => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        patchTheme({
          formEmbedIframeMinHeightPx: minPx,
          formEmbedIframeMaxHeightPx: maxPx,
        });
        rafRef.current = null;
      });
    },
    [patchTheme]
  );

  const stopDrag = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (sessionRef.current) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* pointer may already be released */
        }
      }
      sessionRef.current = null;
    },
    []
  );

  if (disabled) return null;

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize lead form preview height — drag vertically"
      className="-mx-1 mt-px flex cursor-ns-resize touch-none items-center justify-center rounded-b-md border-t border-dashed border-zinc-300/90 bg-gradient-to-b from-zinc-100/95 to-zinc-200/85 py-1.5 text-zinc-500 select-none hover:border-violet-300 hover:from-violet-50 hover:to-zinc-100 hover:text-violet-800"
      tabIndex={0}
      title="Drag up or down to change embed iframe height"
      onKeyDown={(e) => {
        if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
        e.preventDefault();
        const startMin = clampLooseHeight(Number(theme.formEmbedIframeMinHeightPx), 120, 960, 260);
        const startMaxRaw = clampLooseHeight(Number(theme.formEmbedIframeMaxHeightPx), 200, 1200, 720);
        const startSpan = Math.min(Math.max(startMaxRaw - startMin, 120), 1080);
        const step = e.shiftKey ? 24 : 8;
        const delta = e.key === "ArrowDown" ? step : -step;
        let newMin = clampLooseHeight(startMin + delta, 120, 960, startMin);
        let newMax = clampLooseHeight(newMin + startSpan, 200, 1200, startMaxRaw);
        if (newMax < newMin + startSpan) {
          newMin = clampLooseHeight(newMax - startSpan, 120, 960, newMin);
        }
        patchTheme({
          formEmbedIframeMinHeightPx: newMin,
          formEmbedIframeMaxHeightPx: Math.max(newMax, newMin + startSpan),
        });
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        onBeginResize?.();

        const startMin = clampLooseHeight(Number(theme.formEmbedIframeMinHeightPx), 120, 960, 260);
        const startMax = clampLooseHeight(Number(theme.formEmbedIframeMaxHeightPx), 200, 1200, 720);
        const adjustedMax = Math.max(startMax, startMin + 120);
        const span = Math.min(Math.max(adjustedMax - startMin, 120), 1080);

        sessionRef.current = {
          startY: e.clientY,
          startMin,
          startSpan: span,
        };

        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }}
      onPointerMove={(e) => {
        const s = sessionRef.current;
        if (!s) return;
        const delta = e.clientY - s.startY;
        let newMin = clampLooseHeight(s.startMin + delta, 120, 960, s.startMin);
        let newMaxRaw = newMin + s.startSpan;

        /* Keep max ceiling 1200; if we'd exceed it, pinch min upward. */
        if (newMaxRaw > 1200) {
          newMin = clampLooseHeight(1200 - s.startSpan, 120, 960, newMin);
          newMaxRaw = Math.min(newMin + s.startSpan, 1200);
        }

        const newMax = clampLooseHeight(Math.max(newMaxRaw, newMin + 120), Math.max(newMin + 120, 200), 1200, newMaxRaw);
        flushPatch(newMin, newMax);
      }}
      onPointerUp={(e) => stopDrag(e)}
      onPointerCancel={(e) => stopDrag(e)}
    >
      <span className="pointer-events-none flex flex-col gap-1" aria-hidden>
        <span className="mx-auto h-0.5 w-10 rounded-full bg-current opacity-50" />
        <span className="mx-auto h-0.5 w-10 rounded-full bg-current opacity-35" />
        <span className="sr-only">Drag to resize preview height</span>
      </span>
    </div>
  );
}
