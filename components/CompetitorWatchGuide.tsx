import Link from "next/link";

/**
 * Step-by-step: how Competitor watch uses env (Meta + OpenAI) and the in-app flow.
 * Keep in sync with ghl-ai-backend/scripts/verify-competitor-meta.sh and competitorIntel.ts.
 */
export function CompetitorWatchGuide() {
  return (
    <div
      className="mt-6 space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-800 shadow-sm"
      id="competitor-watch-howto"
    >
      <h2 className="text-base font-semibold text-zinc-900">How to use Competitor watch (end-to-end)</h2>
      <ol className="list-decimal space-y-3 pl-5">
        <li>
          <strong>Backend environment (where the API runs — e.g. Render)</strong>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-zinc-600">
            <li>
              <code className="rounded bg-zinc-100 px-1">OPENAI_API_KEY</code> — needed for the AI brief (themes, counter-angles,
              summary). You can use the same key as the rest of the app.
            </li>
            <li>
              <code className="rounded bg-zinc-100 px-1">META_APP_ID</code> and <code className="rounded bg-zinc-100 px-1">META_APP_SECRET</code> from{" "}
              <a href="https://developers.facebook.com/apps/" className="text-violet-700 underline" target="_blank" rel="noreferrer">
                Meta for Developers
              </a>{" "}
              → your app → <strong>App settings</strong> → <strong>Basic</strong>. The backend builds{" "}
              <code className="rounded bg-zinc-100 px-0.5">APP_ID|APP_SECRET</code> for Ad Library when no separate library token is set (same vars as Meta OAuth).
            </li>
            <li>
              Optional: <code className="rounded bg-zinc-100 px-1">META_AD_LIBRARY_TOKEN</code> — when set on the API host, competitor Ad Library calls use this token <strong>first</strong> (e.g. long-lived token from Graph). Useful if app-access errors persist; remember long-lived tokens still expire unless renewed.
            </li>
            <li>
              Optional: <code className="rounded bg-zinc-100 px-1">META_GRAPH_API_VERSION</code> (e.g. <code className="rounded bg-zinc-100 px-0.5">v25.0</code>).
            </li>
          </ul>
        </li>
        <li>
          <strong>Local backend</strong> — In <code className="rounded bg-zinc-100 px-1">ghl-ai-backend/.env</code>, add the same{" "}
          <code className="rounded bg-zinc-100 px-0.5">META_*</code> and <code className="rounded bg-zinc-100 px-0.5">OPENAI_API_KEY</code> if you want to test scans on your machine.
          If Meta vars only exist on Render, local scans will still do <strong>website + OpenAI</strong> but skip Ad Library until you add them locally.
        </li>
        <li>
          <strong>Optional: verify Meta before the UI</strong> — Terminal, from the backend repo:
          <code className="mt-1 block whitespace-pre-wrap break-all rounded bg-zinc-100 px-1.5 py-1 text-xs">
            chmod +x scripts/verify-competitor-meta.sh &amp;&amp; ./scripts/verify-competitor-meta.sh
          </code>
          <p className="mt-1 text-zinc-600">
            Expect <code className="rounded bg-zinc-100 px-0.5">HTTP 200</code> and JSON. Test a specific Page id:{" "}
            <code className="break-all rounded bg-zinc-100 px-1 py-0.5 text-xs">./scripts/verify-competitor-meta.sh YOUR_PAGE_ID</code>
          </p>
        </li>
        <li>
          <strong>In the app</strong> — <Link href="/competitors" className="text-violet-700 underline">Competitors</Link> → create
          a watch → set <strong>Website</strong> (https) and the competitor&apos;s <strong>Facebook Page</strong> (paste the
          facebook.com/… link or the id) and <strong>Keywords</strong> → <strong>Save settings</strong> → <strong>Run scan
          now</strong>. The server turns links into a Page id using Graph.
        </li>
        <li>
          <strong>Success</strong> — New rows under <strong>Intelligence &amp; history</strong>; optional ads under{" "}
          <strong>Meta ads in your workspace</strong>. If Meta returns no rows (or an error), check the summary text and Render
          logs — Graph may return empty <code className="rounded bg-zinc-100 px-0.5">data</code> if that Page has no matching public
          ads for the query; the website + AI parts can still succeed.
        </li>
      </ol>
    </div>
  );
}
