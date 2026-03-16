"use client";

/**
 * Renders ad copy the way it would look as a feed ad (Meta/Instagram style).
 * Copy is split into headline (first line or first 60 chars) and body (rest).
 */
export default function AdPreview({
  copy,
  platform = "meta",
}: {
  copy: string;
  platform?: string;
}) {
  const text = (copy || "").trim() || "Your ad copy will appear here.";
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const firstLine = lines[0] || "";
  const restOfLines = lines.slice(1).join("\n");
  const headline = firstLine.length <= 60 ? firstLine : firstLine.slice(0, 57) + "...";
  const body = restOfLines || (firstLine.length > 60 ? firstLine.slice(60).trim() : "");

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm overflow-hidden">
      {/* Top: Sponsored label */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100">
        <span className="text-[10px] uppercase tracking-wide text-zinc-400">Sponsored</span>
        {platform === "meta" && (
          <span className="text-[10px] text-zinc-400">·</span>
        )}
      </div>

      {/* Image placeholder */}
      <div className="aspect-[1.91/1] bg-zinc-100 flex items-center justify-center">
        <span className="text-xs text-zinc-400">Image / creative</span>
      </div>

      {/* Copy: headline + body (like feed ad) */}
      <div className="px-3 py-2 space-y-1">
        {headline && (
          <p className="text-sm font-semibold text-zinc-900 line-clamp-1">{headline}</p>
        )}
        {body && (
          <p className="text-xs text-zinc-700 line-clamp-3 whitespace-pre-wrap">{body}</p>
        )}
        {!headline && !body && (
          <p className="text-xs text-zinc-500 italic">{text}</p>
        )}
      </div>

      {/* CTA */}
      <div className="px-3 pb-3">
        <span className="inline-block rounded px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100">
          Learn More
        </span>
      </div>
    </div>
  );
}
