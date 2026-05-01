import type { ReactNode } from "react";

export type YourCampaignIdea = {
  title: string;
  platform: string;
  angle: string;
  adCopy: string;
  whyItWorks: string;
};

/** Landscape / market-overview extras nested under `competitivePack.landscapeAnalysis` in saved JSON. */
export type LandscapeAnalysisParsed = {
  standoutAdvertisers: { name: string; rank: number; rationale: string }[];
  whatOthersDoWell: string[];
  howYouCanStandOut: string[];
};

export type CompetitivePackParsed = {
  theirPlaybook: string;
  howToWin: string[];
  yourCampaigns: YourCampaignIdea[];
  theirAdTactics: { headline: string; tactic: string }[];
  landscapeAnalysis?: LandscapeAnalysisParsed | null;
};

export function parseLandscapeAnalysis(x: unknown): LandscapeAnalysisParsed | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const standoutAdvertisers: LandscapeAnalysisParsed["standoutAdvertisers"] = [];
  if (Array.isArray(o.standoutAdvertisers)) {
    for (const item of o.standoutAdvertisers.slice(0, 10)) {
      if (!item || typeof item !== "object") continue;
      const r = item as Record<string, unknown>;
      const name = typeof r.name === "string" ? r.name.trim() : "";
      if (!name) continue;
      let rank = typeof r.rank === "number" && Number.isFinite(r.rank) ? Math.round(r.rank) : standoutAdvertisers.length + 1;
      rank = Math.min(99, Math.max(1, rank));
      const rationale = typeof r.rationale === "string" ? r.rationale.trim() : "";
      standoutAdvertisers.push({ name: name.slice(0, 140), rank, rationale });
    }
    standoutAdvertisers.sort((a, b) => a.rank - b.rank);
  }
  const whatOthersDoWell = Array.isArray(o.whatOthersDoWell)
    ? o.whatOthersDoWell.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((s) => s.trim()).slice(0, 14)
    : [];
  const howYouCanStandOut = Array.isArray(o.howYouCanStandOut)
    ? o.howYouCanStandOut.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((s) => s.trim()).slice(0, 14)
    : [];
  if (!standoutAdvertisers.length && !whatOthersDoWell.length && !howYouCanStandOut.length) return null;
  return {
    standoutAdvertisers: standoutAdvertisers.slice(0, 8),
    whatOthersDoWell,
    howYouCanStandOut,
  };
}

export function parseCompetitivePack(x: unknown): CompetitivePackParsed | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  if (typeof o.theirPlaybook !== "string") return null;
  const landscapeAnalysis = parseLandscapeAnalysis(o.landscapeAnalysis);
  const howToWin = Array.isArray(o.howToWin)
    ? o.howToWin.filter((a): a is string => typeof a === "string").map((s) => s.trim())
    : [];
  const yourCampaigns: YourCampaignIdea[] = [];
  if (Array.isArray(o.yourCampaigns)) {
    for (const c of o.yourCampaigns) {
      if (!c || typeof c !== "object") continue;
      const w = c as Record<string, unknown>;
      if (typeof w.title === "string" && typeof w.adCopy === "string") {
        yourCampaigns.push({
          title: w.title,
          platform: typeof w.platform === "string" ? w.platform : "meta",
          angle: typeof w.angle === "string" ? w.angle : "",
          adCopy: w.adCopy,
          whyItWorks: typeof w.whyItWorks === "string" ? w.whyItWorks : "",
        });
      }
    }
  }
  const theirAdTactics: { headline: string; tactic: string }[] = [];
  if (Array.isArray(o.theirAdTactics)) {
    for (const t of o.theirAdTactics) {
      if (t && typeof t === "object" && typeof (t as { headline?: string }).headline === "string") {
        theirAdTactics.push({
          headline: (t as { headline: string }).headline,
          tactic: typeof (t as { tactic?: string }).tactic === "string" ? (t as { tactic: string }).tactic : "",
        });
      }
    }
  }
  return { theirPlaybook: o.theirPlaybook, howToWin, yourCampaigns, theirAdTactics, landscapeAnalysis };
}

/** Matches Home campaign creator sessionStorage shape used on competitor watch pages. */
export function storeCampaignPrefillForHome(idea: YourCampaignIdea, namePrefix: string): void {
  if (typeof window === "undefined") return;
  const n = `${namePrefix || "Harvest"} — ${idea.title}`.slice(0, 120);
  const pLower = idea.platform.toLowerCase();
  const selectedPlatforms: ("meta" | "google" | "tiktok" | "linkedin")[] = pLower.includes("google")
    ? ["google"]
    : pLower.includes("linkedin")
      ? ["linkedin"]
      : pLower.includes("tiktok")
        ? ["tiktok"]
        : ["meta"];
  sessionStorage.setItem(
    "ghl-campaign-prefill",
    JSON.stringify({
      name: n,
      prompt: [idea.angle && `**Angle:** ${idea.angle}`, idea.adCopy, idea.whyItWorks && `**Why it can win:** ${idea.whyItWorks}`]
        .filter(Boolean)
        .join("\n\n"),
      creativePrompt: pLower.includes("google")
        ? "Match Google ad style: clear headline + CTA in description."
        : "High-impact visual; match the angle above in the ad image or video.",
      selectedPlatforms,
    })
  );
}

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
