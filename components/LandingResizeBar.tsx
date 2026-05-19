"use client";

import { useCallback, useRef, type KeyboardEvent, type PointerEvent } from "react";

function clampInt(n: number, lo: number, hi: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

export type ResizeBarAxis = "y" | "x";

export type LandingResizeBarProps = {
  axis: ResizeBarAxis;
  ariaLabel: string;
  /** Native tooltip */
  title?: string;
  disabled?: boolean;
  onBegin?: () => void;
  getValue: () => number;
  clamp: readonly [number, number];
  apply: (n: number) => void;
  /** Horizontal strip vs narrow vertical thumb for side edges */
  layout: "horizontalStrip" | "verticalThumb";
  className?: string;
};

/** Pointer + keyboard (+/− arrows) resize control for funnel editor theme sizing. */
export default function LandingResizeBar({
  axis,
  ariaLabel,
  title,
  disabled,
  onBegin,
  getValue,
  clamp,
  apply,
  layout,
  className = "",
}: LandingResizeBarProps) {
  const sessionRef = useRef<{ pointerStart: number; valueStart: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  const flush = useCallback(
    (n: number) => {
      const [lo, hi] = clamp;
      const v = clampInt(n, lo, hi, (lo + hi) / 2);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        apply(v);
        rafRef.current = null;
      });
    },
    [apply, clamp]
  );

  const stopDrag = useCallback((e: PointerEvent<HTMLElement>) => {
    if (sessionRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    }
    sessionRef.current = null;
  }, []);

  if (disabled) return null;

  const cursorClass = axis === "y" ? "cursor-ns-resize" : "cursor-ew-resize";
  const layoutClass =
    layout === "horizontalStrip"
      ? "-mx-1 flex justify-center rounded-b-md border-t border-dashed border-zinc-300/90 bg-gradient-to-b from-zinc-100/95 to-zinc-200/85 py-1.5"
      : "flex min-h-[3.25rem] w-4 shrink-0 items-center justify-center rounded-md border border-dashed border-zinc-300/90 bg-gradient-to-r from-zinc-100/95 to-zinc-200/85 px-1";

  return (
    <div
      role="separator"
      aria-orientation={axis === "y" ? "horizontal" : "vertical"}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      tabIndex={0}
      className={`${cursorClass} ${layoutClass} touch-none select-none text-zinc-500 hover:border-violet-300 hover:bg-violet-50/70 hover:text-violet-800 ${className}`}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        const step = e.shiftKey ? 4 : 1;
        const pos = axis === "y" ? e.key === "ArrowDown" : e.key === "ArrowRight";
        const neg = axis === "y" ? e.key === "ArrowUp" : e.key === "ArrowLeft";
        if (!pos && !neg) return;
        e.preventDefault();
        const delta = pos ? step : -step;
        const [lo, hi] = clamp;
        const next = clampInt(getValue() + delta, lo, hi, getValue());
        apply(next);
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        onBegin?.();
        sessionRef.current = {
          pointerStart: axis === "y" ? e.clientY : e.clientX,
          valueStart: getValue(),
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
        const pos = axis === "y" ? e.clientY : e.clientX;
        const delta = pos - s.pointerStart;
        flush(s.valueStart + delta);
      }}
      onPointerUp={(e) => stopDrag(e)}
      onPointerCancel={(e) => stopDrag(e)}
    >
      <span className="pointer-events-none flex flex-col gap-0.5 opacity-55" aria-hidden>
        <span className={`rounded-full bg-current ${layout === "horizontalStrip" ? "mx-auto h-0.5 w-10" : "mx-auto my-px h-3 w-0.5"}`} />
        <span className={`rounded-full bg-current ${layout === "horizontalStrip" ? "mx-auto h-0.5 w-10" : "mx-auto my-px h-3 w-0.5"}`} />
        <span className={`rounded-full bg-current ${layout === "horizontalStrip" ? "mx-auto hidden h-0.5 w-10" : "mx-auto my-px h-3 w-0.5"}`} />
      </span>
    </div>
  );
}
