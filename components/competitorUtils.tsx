import type { ReactNode } from "react";

export function stringArrayFromJson(x: unknown, max = 8): string[] {
  if (!Array.isArray(x)) return [];
  return x
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((s) => s.trim())
    .slice(0, max);
}

export function strongestAdsFromJson(x: unknown): { headline: string; note?: string }[] {
  if (!Array.isArray(x)) return [];
  const out: { headline: string; note?: string }[] = [];
  for (const item of x) {
    if (typeof item === "string" && item.trim()) {
      out.push({ headline: item.trim() });
      continue;
    }
    if (item && typeof item === "object" && "headline" in item && typeof (item as { headline: string }).headline === "string") {
      const h = (item as { headline: string; note?: string }).headline.trim();
      if (h)
        out.push({
          headline: h,
          note: typeof (item as { note?: string }).note === "string" ? (item as { note: string }).note : undefined,
        });
    }
  }
  return out.slice(0, 8);
}

/** Render a scan summary: paragraphs + simple **bold** (no full markdown). */
export function renderInsightSummaryText(text: string): ReactNode {
  const blocks = text.split(/\n{2,}/).filter(Boolean);
  return (
    <div className="space-y-3 text-zinc-800">
      {blocks.map((block, i) => (
        <p key={i} className="whitespace-pre-wrap text-sm leading-relaxed">
          {formatBoldSegments(block)}
        </p>
      ))}
    </div>
  );
}

function formatBoldSegments(s: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) {
      parts.push(s.slice(last, m.index));
    }
    parts.push(
      <strong key={key++} className="font-semibold text-zinc-900">
        {m[1]}
      </strong>
    );
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return parts.length > 0 ? <>{parts}</> : s;
}
