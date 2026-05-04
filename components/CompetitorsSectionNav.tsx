"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function segmentClass(active: boolean) {
  return [
    "rounded-lg px-3 py-2 text-sm font-medium transition",
    active
      ? "bg-violet-600 text-white shadow-sm"
      : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900",
  ].join(" ");
}

/**
 * Primary navigation within Competitors: Ads Library research vs named watches.
 */
export function CompetitorsSectionNav({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const onHarvest = pathname?.startsWith("/competitors/harvest") ?? false;
  const onWatchesList = pathname === "/competitors/watches";
  const onWatchDetail =
    typeof pathname === "string" &&
    /^\/competitors\/[^/]+$/.test(pathname) &&
    pathname !== "/competitors/watches" &&
    pathname !== "/competitors/harvest";

  return (
    <nav
      className={`flex flex-wrap items-center gap-2 ${className}`.trim()}
      aria-label="Competitors sections"
    >
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Competitors</span>
      <div
        className="flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-white p-1 shadow-sm"
        role="tablist"
      >
        <Link href="/competitors/harvest" className={segmentClass(onHarvest)} role="tab" aria-current={onHarvest ? "page" : undefined}>
          Ads Library research
        </Link>
        <Link
          href="/competitors/watches"
          className={segmentClass(onWatchesList || onWatchDetail)}
          role="tab"
          aria-current={onWatchesList || onWatchDetail ? "page" : undefined}
        >
          Competitor watches
        </Link>
      </div>
    </nav>
  );
}
