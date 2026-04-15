"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AppNav from "@/components/AppNav";
import { ExpansionProductGate } from "@/components/ExpansionProductGate";
import { useAuth } from "@/contexts/AuthContext";
import { expansion, type CompetitorWatchDetail } from "@/lib/api";

function keywordsToString(kw: unknown): string {
  if (!Array.isArray(kw)) return "";
  return kw.filter((x): x is string => typeof x === "string").join(", ");
}

function platformsToString(pl: unknown): string {
  if (!Array.isArray(pl)) return "";
  return pl.filter((x): x is string => typeof x === "string").join(", ");
}

function CompetitorDetailInner() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { user, loading } = useAuth();

  const [watch, setWatch] = useState<CompetitorWatchDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [competitorName, setCompetitorName] = useState("");
  const [website, setWebsite] = useState("");
  const [fbId, setFbId] = useState("");
  const [googleId, setGoogleId] = useState("");
  const [keywords, setKeywords] = useState("");
  const [platforms, setPlatforms] = useState("meta, google");
  const [isActive, setIsActive] = useState(true);

  const load = useCallback(async () => {
    if (!id || !user) return;
    setLoadError(null);
    try {
      const { watch: w } = await expansion.competitor.getWatch(id);
      setWatch({
        ...w,
        insights: Array.isArray(w.insights) ? w.insights : [],
        ads: Array.isArray(w.ads) ? w.ads : [],
      });
      setCompetitorName(w.competitorName);
      setWebsite(w.competitorWebsite ?? "");
      setFbId(w.competitorFacebookPageId ?? "");
      setGoogleId(w.competitorGoogleAdvertiserId ?? "");
      setKeywords(keywordsToString(w.keywords));
      setPlatforms(platformsToString(w.platforms) || "meta");
      setIsActive(w.isActive);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load");
      setWatch(null);
    }
  }, [id, user]);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    if (user && id) void load();
  }, [user, id, load]);

  async function save() {
    if (!id) return;
    setActionError(null);
    setSaving(true);
    try {
      const kw = keywords
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const pl = platforms
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      await expansion.competitor.updateWatch(id, {
        competitorName: competitorName.trim(),
        competitorWebsite: website.trim() || null,
        competitorFacebookPageId: fbId.trim() || null,
        competitorGoogleAdvertiserId: googleId.trim() || null,
        keywords: kw,
        platforms: pl.length ? pl : ["meta"],
        isActive,
      });
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function runScan() {
    if (!id) return;
    setScanning(true);
    setActionError(null);
    try {
      const { watch: w } = await expansion.competitor.scanWatch(id);
      setWatch({
        ...w,
        insights: Array.isArray(w.insights) ? w.insights : [],
        ads: Array.isArray(w.ads) ? w.ads : [],
      });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  async function remove() {
    if (!id || !confirm("Delete this competitor watch and its data?")) return;
    setActionError(null);
    try {
      await expansion.competitor.deleteWatch(id);
      router.push("/competitors");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-violet-600" />
      </div>
    );
  }

  if (loadError || !watch) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <AppNav />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-red-600">{loadError || "Not found"}</p>
          <Link href="/competitors" className="mt-4 inline-block text-violet-700 hover:underline">
            ← Competitors
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/competitors" className="text-sm text-violet-700 hover:underline">
          ← All watches
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-zinc-900">{watch.competitorName}</h1>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runScan()}
              disabled={scanning}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {scanning ? "Scanning…" : "Run scan"}
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={remove}
              className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
        {actionError && <p className="mt-2 text-sm text-red-600">{actionError}</p>}

        <div className="mt-8 space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Competitor name</label>
            <input
              value={competitorName}
              onChange={(e) => setCompetitorName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Website</label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Meta page id (optional)</label>
              <input
                value={fbId}
                onChange={(e) => setFbId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Google advertiser id (optional)</label>
              <input
                value={googleId}
                onChange={(e) => setGoogleId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Keywords</label>
            <textarea
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Platforms (comma-separated)</label>
            <input
              value={platforms}
              onChange={(e) => setPlatforms(e.target.value)}
              placeholder="meta, google, tiktok"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-800">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
            Active
          </label>
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-900">Insights</h2>
          {(watch.insights ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-zinc-600">Run a scan to add the first insight snapshot.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {(watch.insights ?? []).map((ins) => (
                <li key={ins.id} className="rounded-lg border border-zinc-200 bg-white p-4 text-sm shadow-sm">
                  <p className="text-xs text-zinc-500">{new Date(ins.generatedAt).toLocaleString()}</p>
                  <p className="mt-2 whitespace-pre-wrap text-zinc-800">{ins.summary}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-900">Ads captured</h2>
          {(watch.ads ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-zinc-600">
              No ads stored yet. A future integration can populate this from Ad Library APIs.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {(watch.ads ?? []).map((ad) => (
                <li key={ad.id} className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm">
                  <p className="font-medium text-zinc-900">
                    {ad.platform} · {ad.adLibraryId}
                  </p>
                  {ad.headline && <p className="mt-1 text-zinc-700">{ad.headline}</p>}
                  {ad.destinationUrl && (
                    <a
                      href={ad.destinationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs text-violet-700 hover:underline"
                    >
                      Destination
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

export default function CompetitorDetailPage() {
  return (
    <ExpansionProductGate productKey="competitors">
      <CompetitorDetailInner />
    </ExpansionProductGate>
  );
}
