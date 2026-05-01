import Link from "next/link";

/** In-app guidance for people using Competitor watch (not operator setup docs). */
export function CompetitorWatchGuide() {
  return (
    <div
      className="mt-6 space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-800 shadow-sm"
      id="competitor-watch-howto"
    >
      <h2 className="text-base font-semibold text-zinc-900">How to use Competitor watch</h2>
      <ol className="list-decimal space-y-3 pl-5 text-zinc-700">
        <li>
          Enter the competitor&apos;s <strong>website</strong> so we can summarize their public positioning and messaging.
        </li>
        <li>
          Add their <strong>Facebook Page</strong> using a normal Page link (or the Page id from the Page profile) when you want their
          public Meta ads included. If you are not sure which Page runs their ads, you can leave this blank and lean on their name plus your
          <strong> keywords</strong>—we search the public ad library and narrow the results to what matches.
        </li>
        <li>
          Save the watch, then run a scan whenever the market shifts. Each run adds notes and themes to that competitor&apos;s history in
          your account.
        </li>
        <li>
          Want to start from a topic instead of naming one rival? Use{" "}
          <Link href="/competitors/harvest" className="font-medium text-violet-700 underline hover:text-violet-800">
            ad library research
          </Link>{" "}
          to gather ads by keyword, skim the advertisers that show up, and build saved market or brand summaries from there.
        </li>
      </ol>
      <p className="border-t border-zinc-100 pt-4 text-sm text-zinc-600">
        If part of a scan looks empty—for example fewer ads than you expected—that usually means nothing matched publicly for that Page or
        phrase yet. Run again later or adjust keywords. Your account team can help if something consistently fails to load.
      </p>
    </div>
  );
}
