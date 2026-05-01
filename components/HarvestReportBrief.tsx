"use client";

import { useRouter } from "next/navigation";
import type { MetaHarvestReportPayload } from "@/lib/api";
import {
  parseCompetitivePack,
  renderInsightSummaryText,
  storeCampaignPrefillForHome,
  stringArrayFromJson,
  strongestAdsFromJson,
  type YourCampaignIdea,
} from "@/components/competitorUtils";

export function HarvestReportBriefBody({
  report,
  campaignNamePrefix,
}: {
  report: MetaHarvestReportPayload;
  campaignNamePrefix: string;
}) {
  const router = useRouter();
  const pack = parseCompetitivePack(report.competitivePack);
  const themes = stringArrayFromJson(report.topThemes, 10);
  const angles = stringArrayFromJson(report.suggestedCounterAngles, 12);
  const strong = strongestAdsFromJson(report.strongestAds);
  const land = pack?.landscapeAnalysis ?? null;

  function useIdea(idea: YourCampaignIdea) {
    storeCampaignPrefillForHome(idea, campaignNamePrefix || "Harvest");
    router.push("/?open=create");
  }

  return (
    <div className="space-y-8">
      <div className="prose prose-sm prose-zinc max-w-none">{renderInsightSummaryText(report.summary)}</div>

      {land ? (
        <div className="space-y-5 border-t border-zinc-100 pt-6">
          <h3 className="text-sm font-semibold text-zinc-900">Who is standing out in this sample</h3>
          <p className="text-xs text-zinc-500">
            Inferred from ad copy themes in your harvest — not performance data from Meta.
          </p>
          {land.standoutAdvertisers.length > 0 ? (
            <ol className="list-decimal space-y-3 pl-4 text-sm text-zinc-800">
              {land.standoutAdvertisers.map((s, i) => (
                <li key={`${s.name}-${i}`} className="rounded-lg border border-violet-100 bg-violet-50/40 px-3 py-2">
                  <p className="font-medium text-zinc-900">
                    #{s.rank} — {s.name}
                  </p>
                  {s.rationale ? <p className="mt-1 text-zinc-700">{s.rationale}</p> : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-zinc-600">No ranked list in this brief (thin or mixed sample).</p>
          )}

          {land.whatOthersDoWell.length > 0 ? (
            <div>
              <h4 className="text-sm font-semibold text-zinc-900">What seems to work for others</h4>
              <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm text-zinc-800">
                {land.whatOthersDoWell.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
            </div>
          ) : null}

          {land.howYouCanStandOut.length > 0 ? (
            <div>
              <h4 className="text-sm font-semibold text-zinc-900">How you can stand out</h4>
              <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm text-zinc-800">
                {land.howYouCanStandOut.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      ) : null}

      {pack ? (
        <div className="space-y-5 border-t border-zinc-100 pt-6">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">
              {land ? "Dominant playbook in this market slice" : "What they do (marketing read)"}
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{pack.theirPlaybook}</p>
          </div>
          {pack.howToWin.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">{land ? "How to win in this landscape" : "How to beat them"}</h3>
              <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm text-zinc-800">
                {pack.howToWin.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ol>
            </div>
          ) : null}
          {pack.theirAdTactics.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">{land ? "Recurring ad archetypes" : "What their ads are doing"}</h3>
              <ul className="mt-2 space-y-2 text-sm text-zinc-800">
                {pack.theirAdTactics.map((a, j) => (
                  <li key={j} className="rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2">
                    <p className="font-medium text-amber-950">{a.headline}</p>
                    <p className="mt-0.5 text-amber-900/90">{a.tactic}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {pack.yourCampaigns.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Campaign ideas (starter copy)</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Opens <strong>Home</strong> with a new campaign draft prefilled from the suggestion.
              </p>
              <ul className="mt-3 space-y-4">
                {pack.yourCampaigns.map((idea, k) => (
                  <li key={k} className="rounded-xl border border-violet-200 bg-violet-50/30 p-4">
                    <p className="font-semibold text-violet-950">{idea.title}</p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Suggested: <span className="font-medium text-zinc-800">{idea.platform}</span>
                    </p>
                    {idea.angle ? <p className="mt-2 text-sm text-zinc-800">{idea.angle}</p> : null}
                    <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800">{idea.adCopy}</p>
                    {idea.whyItWorks ? <p className="mt-2 text-xs text-zinc-600">Why: {idea.whyItWorks}</p> : null}
                    <button
                      type="button"
                      onClick={() => useIdea(idea)}
                      className="mt-3 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
                    >
                      Use for new campaign on Home
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {themes.length > 0 ? (
        <div className="border-t border-zinc-100 pt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Themes</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {themes.map((t) => (
              <li key={t} className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-900">
                {t}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {angles.length > 0 ? (
        <div className="border-t border-zinc-100 pt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Counter-angles to test</h3>
          <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm text-zinc-800">
            {angles.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {strong.length > 0 ? (
        <div className="border-t border-zinc-100 pt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Strong patterns in the sample</h3>
          <ul className="mt-2 space-y-2">
            {strong.map((s, j) => (
              <li key={j} className="rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-2 text-sm text-zinc-800">
                <p className="font-medium text-zinc-900">{s.headline}</p>
                {s.note ? <p className="mt-1 text-xs text-zinc-600">{s.note}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
