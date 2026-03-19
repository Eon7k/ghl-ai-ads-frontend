"use client";

/**
 * Renders ad copy the way it would look as a feed ad (Meta/Instagram style).
 * Copy is split into headline (first line or first 60 chars) and body (rest).
 * If imageUrl is provided (AI-generated creative), it is shown in the image area.
 */
export default function AdPreview({
  copy,
  platform = "meta",
  imageUrl,
  /** When false, the creative image won’t start its own browser drag (use when the parent handles drag-to-swap). */
  imageDraggable = true,
}: {
  copy: string;
  platform?: string;
  imageUrl?: string | null;
  imageDraggable?: boolean;
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

      {/* Image: AI-generated creative or placeholder */}
      <div className="relative aspect-[1.91/1] bg-zinc-100 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Ad creative"
            draggable={imageDraggable}
            className={`absolute inset-0 h-full w-full object-cover select-none ${imageDraggable ? "" : "pointer-events-none"}`}
          />
        ) : (
          <span className="text-xs text-zinc-400">Image / creative</span>
        )}
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
