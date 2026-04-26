"use client";

/**
 * Obvious, step-by-step guidance for a screen. Use short sentences; assume no prior ad-tech knowledge.
 */
export function PageGuide({
  title = "What to do on this page",
  steps,
  className = "",
}: {
  title?: string;
  steps: string[];
  className?: string;
}) {
  if (!steps.length) return null;
  return (
    <aside
      className={`rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/40 p-4 shadow-sm shadow-zinc-900/5 sm:p-5 ${className}`.trim()}
      aria-label="Step-by-step guide"
    >
      <h2 className="text-sm font-bold tracking-wide text-indigo-950">{title}</h2>
      <ol className="mt-3 list-decimal space-y-2.5 pl-5 text-sm leading-relaxed text-zinc-800 marker:font-semibold marker:text-indigo-700">
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </aside>
  );
}
