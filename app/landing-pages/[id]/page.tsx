"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AppNav from "@/components/AppNav";
import { ExpansionProductGate } from "@/components/ExpansionProductGate";
import { useAuth } from "@/contexts/AuthContext";
import { api, expansion, type LandingPageData, type LandingPageRecord } from "@/lib/api";
import type { Experiment } from "@/lib/types";

function normalizePageData(raw: unknown): LandingPageData {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  return {
    headline: typeof o.headline === "string" ? o.headline : "",
    subheadline: typeof o.subheadline === "string" ? o.subheadline : "",
    body: typeof o.body === "string" ? o.body : "",
    ctaText: typeof o.ctaText === "string" ? o.ctaText : "",
    ctaUrl: typeof o.ctaUrl === "string" ? o.ctaUrl : "",
  };
}

function LandingPageEditorPageInner() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { user, loading } = useAuth();

  const [page, setPage] = useState<LandingPageRecord | null>(null);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState("draft");
  const [campaignId, setCampaignId] = useState<string>("");
  const [pageData, setPageData] = useState<LandingPageData>({});
  const [aiPrompt, setAiPrompt] = useState("");
  const [conversionGoal, setConversionGoal] = useState("");
  const [pixel, setPixel] = useState("");

  const load = useCallback(async () => {
    if (!id || !user) return;
    setLoadError(null);
    try {
      const [{ page: row }, exList] = await Promise.all([
        expansion.landingPages.get(id),
        api.listExperiments().catch(() => [] as Experiment[]),
      ]);
      setPage(row);
      setTitle(row.title);
      setSlug(row.slug);
      setStatus(row.status);
      setCampaignId(row.campaignId ?? "");
      setPageData(normalizePageData(row.pageData));
      setAiPrompt(row.aiGenerationPrompt ?? "");
      setConversionGoal(row.conversionGoal ?? "");
      setPixel(row.conversionTrackingPixel ?? "");
      setExperiments(exList);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load page");
      setPage(null);
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
    setSaveError(null);
    setSaveOk(false);
    setSaving(true);
    try {
      const { page: row } = await expansion.landingPages.update(id, {
        title: title.trim(),
        slug: slug.trim() || undefined,
        status,
        campaignId: campaignId || null,
        pageData,
        aiGenerationPrompt: aiPrompt.trim() || null,
        conversionGoal: conversionGoal.trim() || null,
        conversionTrackingPixel: pixel.trim() || null,
      });
      setPage(row);
      setTitle(row.title);
      setSlug(row.slug);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!id || !confirm("Delete this landing page? This cannot be undone.")) return;
    setDeleting(true);
    setSaveError(null);
    try {
      await expansion.landingPages.delete(id);
      router.push("/landing-pages");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  function updateField<K extends keyof LandingPageData>(key: K, value: string) {
    setPageData((prev) => ({ ...prev, [key]: value }));
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-violet-600" />
      </div>
    );
  }

  if (loadError || !page) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <AppNav />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-red-600">{loadError || "Not found"}</p>
          <Link href="/landing-pages" className="mt-4 inline-block text-violet-700 hover:underline">
            ← Back to landing pages
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/landing-pages" className="text-sm text-violet-700 hover:underline">
          ← All landing pages
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-zinc-900">Edit landing page</h1>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={deleting}
              className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
        {saveOk && <p className="mt-2 text-sm text-green-700">Saved.</p>}
        {saveError && <p className="mt-2 text-sm text-red-600">{saveError}</p>}

        <div className="mt-8 space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">URL slug</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="spring-promo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Linked campaign (optional)</label>
              <select
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="">— None —</option>
                {experiments.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} ({ex.platform})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-zinc-100 pt-6">
            <h2 className="text-sm font-semibold text-zinc-900">Page content</h2>
            <p className="mt-1 text-xs text-zinc-500">Stored as structured data for a future visual editor and AI generation.</p>
            <div className="mt-4 grid gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Headline</label>
                <input
                  value={pageData.headline ?? ""}
                  onChange={(e) => updateField("headline", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Subheadline</label>
                <input
                  value={pageData.subheadline ?? ""}
                  onChange={(e) => updateField("subheadline", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Body</label>
                <textarea
                  value={pageData.body ?? ""}
                  onChange={(e) => updateField("body", e.target.value)}
                  rows={6}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-700">CTA button text</label>
                  <input
                    value={pageData.ctaText ?? ""}
                    onChange={(e) => updateField("ctaText", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700">CTA URL</label>
                  <input
                    value={pageData.ctaUrl ?? ""}
                    onChange={(e) => updateField("ctaUrl", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    placeholder="https://"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-100 pt-6">
            <h2 className="text-sm font-semibold text-zinc-900">AI & tracking (optional)</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700">AI generation prompt</label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={3}
                  placeholder="Describe the offer, audience, and tone for a future AI draft…"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Conversion goal</label>
                <input
                  value={conversionGoal}
                  onChange={(e) => setConversionGoal(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="e.g. Lead form submit"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Tracking pixel / snippet</label>
                <textarea
                  value={pixel}
                  onChange={(e) => setPixel(e.target.value)}
                  rows={2}
                  placeholder="Paste Meta/Google snippet or image URL"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LandingPageEditorPage() {
  return (
    <ExpansionProductGate productKey="landing_pages">
      <LandingPageEditorPageInner />
    </ExpansionProductGate>
  );
}
