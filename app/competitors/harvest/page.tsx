"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppNav from "@/components/AppNav";
import { ExpansionProductGate } from "@/components/ExpansionProductGate";
import { renderInsightSummaryText } from "@/components/competitorUtils";
import { useAuth } from "@/contexts/AuthContext";
import { expansion, type MetaAdHarvestRunRow, type MetaHarvestBrandRow, type MetaHarvestReportPayload } from "@/lib/api";
import { userFacingError } from "@/lib/userFacingError";

function HarvestInner() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const [kwInput, setKwInput] = useState("cryotherapy, longevity spa, body contouring");
  const [label, setLabel] = useState("");
  const [harvestBusy, setHarvestBusy] = useState(false);
  const [runs, setRuns] = useState<MetaAdHarvestRunRow[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);

  const [brandQ, setBrandQ] = useState("");
  const [brands, setBrands] = useState<MetaHarvestBrandRow[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [selectedPages, setSelectedPages] = useState<Record<string, boolean>>({});

  const [reportName, setReportName] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [report, setReport] = useState<MetaHarvestReportPayload | null>(null);

  const [excludeInput, setExcludeInput] = useState("sperm bank, fertility clinic, IVF, egg freezing");
  const [strictFilter, setStrictFilter] = useState(true);

  const [landscapeRunId, setLandscapeRunId] = useState("");
  const [landscapeTopic, setLandscapeTopic] = useState("");
  const [landscapeBusy, setLandscapeBusy] = useState(false);
  const [landscapeReport, setLandscapeReport] = useState<MetaHarvestReportPayload | null>(null);

  const loadRuns = useCallback(async () => {
    if (!user) return;
    setRunsLoading(true);
    try {
      const { runs: r } = await expansion.competitor.listMetaHarvestRuns();
      setRuns(r);
    } catch (e) {
      setError(userFacingError(e));
    } finally {
      setRunsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) void loadRuns();
  }, [user, loadRuns]);

  async function runHarvest() {
    const keywords = kwInput
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2);
    if (!keywords.length) {
      setError("Enter at least one keyword (3+ characters each).");
      return;
    }
    setHarvestBusy(true);
    setError(null);
    try {
      await expansion.competitor.createMetaHarvestRun({
        keywords,
        label: label.trim() || undefined,
      });
      await loadRuns();
      await searchBrandsInternal(brandQ);
    } catch (e) {
      setError(userFacingError(e));
    } finally {
      setHarvestBusy(false);
    }
  }

  async function searchBrandsInternal(q: string) {
    setBrandsLoading(true);
    try {
      const { brands: b } = await expansion.competitor.listMetaHarvestBrands(q.trim() || undefined);
      setBrands(b);
    } catch (e) {
      setError(userFacingError(e));
    } finally {
      setBrandsLoading(false);
    }
  }

  async function searchBrands() {
    setError(null);
    await searchBrandsInternal(brandQ);
  }

  function parseExcludePhrases(): string[] {
    return excludeInput
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 2)
      .slice(0, 24);
  }

  async function generateLandscape() {
    setLandscapeBusy(true);
    setError(null);
    setLandscapeReport(null);
    try {
      const { report: r } = await expansion.competitor.createMetaHarvestLandscapeReport({
        harvestRunId: landscapeRunId.trim() || undefined,
        topicHint: landscapeTopic.trim() || undefined,
        excludePhrases: parseExcludePhrases(),
        strictRelevanceFilter: strictFilter,
      });
      setLandscapeReport(r);
    } catch (e) {
      setError(userFacingError(e));
    } finally {
      setLandscapeBusy(false);
    }
  }

  async function generateReport() {
    const facebookPageIds = Object.entries(selectedPages)
      .filter(([, v]) => v)
      .map(([id]) => id.replace(/\D/g, ""))
      .filter(Boolean);
    if (!facebookPageIds.length) {
      setError("Select at least one brand (checkbox) by Page id.");
      return;
    }
    setReportBusy(true);
    setError(null);
    setReport(null);
    try {
      const { report: r } = await expansion.competitor.createMetaHarvestReport({
        facebookPageIds,
        competitorDisplayName: reportName.trim() || undefined,
        excludePhrases: parseExcludePhrases(),
        strictRelevanceFilter: strictFilter,
      });
      setReport(r);
    } catch (e) {
      setError(userFacingError(e));
    } finally {
      setReportBusy(false);
    }
  }

  function togglePage(pid: string) {
    setSelectedPages((prev) => ({ ...prev, [pid]: !prev[pid] }));
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppNav />
      <main id="main-content" className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex flex-wrap gap-2 text-sm text-violet-700">
          <Link href="/competitors" className="hover:underline">
            ← Competitor watches
          </Link>
          <span className="text-zinc-300">·</span>
          <Link href="/" className="hover:underline">
            Home
          </Link>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-zinc-900">Keyword harvest pool</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Run Meta Ad Library keyword sweeps for your workspace. Ads are stored by advertiser Page. Analyze the whole harvest for market-wide
          patterns, or search brands and run a focused brief — optional AI + phrase filters drop off-vertical noise (e.g. fertility ads in a
          cryotherapy sweep).
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </div>
        )}

        <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">1. Run a keyword harvest</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Comma or newline separated (up to 12). The API merges samples and keeps rows that include{" "}
            <code className="rounded bg-zinc-100 px-0.5">page_id</code>.
          </p>
          <textarea
            value={kwInput}
            onChange={(e) => setKwInput(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="e.g. cryotherapy, mommy makeover Dallas"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Optional label (for your notes)"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={harvestBusy}
            onClick={() => void runHarvest()}
            className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {harvestBusy ? "Harvesting…" : "Run harvest"}
          </button>
        </section>

        <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">2. Recent harvests</h2>
          {runsLoading ? (
            <p className="mt-2 text-sm text-zinc-500">Loading…</p>
          ) : runs.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-600">No harvests yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {runs.map((r) => (
                <li key={r.id} className="rounded border border-zinc-100 px-3 py-2">
                  <span className="font-medium text-zinc-900">{r.label || "Harvest"}</span>
                  <span className="text-zinc-500"> · {r.status}</span>
                  <span className="text-zinc-500"> · {r.adsStored} ads</span>
                  <span className="block text-xs text-zinc-400">{new Date(r.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8 rounded-xl border border-zinc-200 bg-amber-50/50 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">Relevance filters (landscape + brand reports)</h2>
          <p className="mt-1 text-xs text-zinc-600">
            Phrases are matched on page name + ad copy (case-insensitive). When OpenAI is configured, we also run a semantic pass to drop
            mismatches — use <span className="font-medium text-zinc-800">Strict</span> for noisy broad keywords (e.g. “cryotherapy” vs fertility
            cryo).
          </p>
          <textarea
            value={excludeInput}
            onChange={(e) => setExcludeInput(e.target.value)}
            rows={2}
            className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
            placeholder="e.g. sperm bank, fertility, egg donation"
          />
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
            <input type="checkbox" checked={strictFilter} onChange={(e) => setStrictFilter(e.target.checked)} className="rounded" />
            Strict AI relevance (drop more off-topic ads; recommended for ambiguous keywords)
          </label>
        </section>

        <section className="mt-8 rounded-xl border border-sky-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">3. Whole-harvest landscape</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Cross-advertiser view: recurring themes, crowded angles, whitespace, and campaign ideas to differentiate — not a single-brand
            teardown.
          </p>
          <div className="mt-3 space-y-2">
            <label className="block text-xs font-medium text-zinc-600" htmlFor="harvest-scope">
              Scope
            </label>
            <select
              id="harvest-scope"
              value={landscapeRunId}
              onChange={(e) => setLandscapeRunId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All harvest ads in this workspace (latest sample, capped)</option>
              {runs
                .filter((r) => r.status === "completed" && (r.adsStored > 0 || (r._count?.ads ?? 0) > 0))
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {(r.label || "Harvest").slice(0, 60)} · {r.adsStored || r._count?.ads || 0} ads ·{" "}
                    {new Date(r.createdAt).toLocaleDateString()}
                  </option>
                ))}
            </select>
            <input
              value={landscapeTopic}
              onChange={(e) => setLandscapeTopic(e.target.value)}
              placeholder="Optional topic label (defaults to run label or keywords)"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            disabled={landscapeBusy}
            onClick={() => void generateLandscape()}
            className="mt-3 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {landscapeBusy ? "Analyzing…" : "Generate landscape report"}
          </button>
          <p className="mt-2 text-xs text-zinc-500">
            Uses ads from the scope you selected; excludes using the filters above. Needs <code className="rounded bg-zinc-100 px-0.5">OPENAI_API_KEY</code>{" "}
            on the API.
          </p>
          {landscapeReport && (
            <div className="mt-6 border-t border-zinc-100 pt-4">
              <p className="text-xs font-medium uppercase text-zinc-500">
                Landscape ({landscapeReport.adsUsed} ads in brief
                {typeof landscapeReport.adsExcluded === "number" && landscapeReport.adsExcluded > 0
                  ? ` · ${landscapeReport.adsExcluded} filtered out`
                  : ""}
                )
              </p>
              <div className="prose prose-sm mt-2 max-w-none text-zinc-800">{renderInsightSummaryText(landscapeReport.summary)}</div>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">4. Search harvested brands</h2>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              value={brandQ}
              onChange={(e) => setBrandQ(e.target.value)}
              placeholder="Brand name or Page id digits"
              className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={brandsLoading}
              onClick={() => void searchBrands()}
              className="rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
            >
              {brandsLoading ? "Searching…" : "Search"}
            </button>
          </div>
          <button type="button" onClick={() => void searchBrandsInternal("")} className="mt-2 text-xs text-violet-700 hover:underline">
            Load top brands (empty query)
          </button>

          {brands.length > 0 && (
            <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto text-sm">
              {brands.map((b) => (
                <li key={b.facebookPageId} className="flex items-start gap-2 rounded border border-zinc-100 px-2 py-2">
                  <input
                    type="checkbox"
                    checked={!!selectedPages[b.facebookPageId]}
                    onChange={() => togglePage(b.facebookPageId)}
                    className="mt-1 rounded"
                    aria-label={`Select ${b.pageName ?? b.facebookPageId}`}
                  />
                  <div>
                    <p className="font-medium text-zinc-900">{b.pageName || "(unknown name)"}</p>
                    <p className="font-mono text-xs text-zinc-500">{b.facebookPageId}</p>
                    <p className="text-xs text-zinc-500">{b.adCount} ad sample(s)</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8 rounded-xl border border-violet-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">5. Brand competition report</h2>
          <input
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            placeholder="Display name for the brief (optional)"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={reportBusy}
            onClick={() => void generateReport()}
            className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {reportBusy ? "Generating…" : "Generate AI report from selected brands"}
          </button>
          <p className="mt-2 text-xs text-zinc-500">
            Selected Pages only; uses the relevance filters above. Requires OpenAI on the API.
          </p>

          {report && (
            <div className="mt-6 border-t border-zinc-100 pt-4">
              <p className="text-xs font-medium uppercase text-zinc-500">
                Brief ({report.adsUsed} ads
                {typeof report.adsExcluded === "number" && report.adsExcluded > 0 ? ` · ${report.adsExcluded} excluded` : ""})
              </p>
              <div className="prose prose-sm mt-2 max-w-none text-zinc-800">{renderInsightSummaryText(report.summary)}</div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function HarvestPage() {
  return (
    <ExpansionProductGate productKey="competitors">
      <HarvestInner />
    </ExpansionProductGate>
  );
}
