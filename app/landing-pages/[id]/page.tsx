"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AppNav from "@/components/AppNav";
import { ExpansionProductGate } from "@/components/ExpansionProductGate";
import { useAuth } from "@/contexts/AuthContext";
import { api, expansion, type LandingFunnelStep, type LandingPageData, type LandingPageRecord } from "@/lib/api";
import type { Experiment } from "@/lib/types";

function normalizePageData(raw: unknown): LandingPageData {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;

  let funnelSteps: LandingFunnelStep[] | undefined;
  if (Array.isArray(o.funnelSteps)) {
    funnelSteps = o.funnelSteps
      .filter((x) => x && typeof x === "object")
      .map((x) => {
        const s = x as Record<string, unknown>;
        let bullets: string[] | undefined;
        if (Array.isArray(s.bullets)) {
          bullets = s.bullets.filter((b) => typeof b === "string").map((b) => String(b));
          if (bullets.length === 0) bullets = undefined;
        }
        return {
          key: typeof s.key === "string" ? s.key : "",
          title: typeof s.title === "string" ? s.title : "",
          body: typeof s.body === "string" ? s.body : "",
          bullets,
        };
      });
    if (funnelSteps.length === 0) funnelSteps = undefined;
  }

  let faq: { q: string; a: string }[] | undefined;
  if (Array.isArray(o.faq)) {
    faq = o.faq
      .filter((x) => x && typeof x === "object")
      .map((x) => {
        const f = x as Record<string, unknown>;
        return {
          q: typeof f.q === "string" ? f.q : "",
          a: typeof f.a === "string" ? f.a : "",
        };
      })
      .filter((x) => x.q || x.a);
    if (faq.length === 0) faq = undefined;
  }

  let trustSignals: string[] | undefined;
  if (Array.isArray(o.trustSignals)) {
    trustSignals = o.trustSignals
      .filter((x) => typeof x === "string")
      .map((x) => String(x))
      .filter(Boolean);
    if (trustSignals.length === 0) trustSignals = undefined;
  }

  return {
    headline: typeof o.headline === "string" ? o.headline : "",
    subheadline: typeof o.subheadline === "string" ? o.subheadline : "",
    body: typeof o.body === "string" ? o.body : "",
    ctaText: typeof o.ctaText === "string" ? o.ctaText : "",
    ctaUrl: typeof o.ctaUrl === "string" ? o.ctaUrl : "",
    formEmbedHtml: typeof o.formEmbedHtml === "string" ? o.formEmbedHtml : "",
    funnelSteps,
    faq,
    trustSignals,
    thankYouCopy: typeof o.thankYouCopy === "string" ? o.thankYouCopy : "",
    seoTitle: typeof o.seoTitle === "string" ? o.seoTitle : "",
    seoDescription: typeof o.seoDescription === "string" ? o.seoDescription : "",
    formPlacementNote: typeof o.formPlacementNote === "string" ? o.formPlacementNote : "",
    adGoalEcho: typeof o.adGoalEcho === "string" ? o.adGoalEcho : "",
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
  const [competitorBrief, setCompetitorBrief] = useState("");
  const [competitorUrlsScan, setCompetitorUrlsScan] = useState("");
  const [scanBusy, setScanBusy] = useState(false);
  const [aiDraftBusy, setAiDraftBusy] = useState(false);

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

  async function runUrlAnalysis() {
    if (!competitorUrlsScan.trim()) {
      setSaveError("Paste URLs to analyze (one per line).");
      return;
    }
    setScanBusy(true);
    setSaveError(null);
    try {
      const r = await expansion.landingPages.competitorScan({ urlsText: competitorUrlsScan });
      if (r.synthesis) setCompetitorBrief(r.synthesis);
      else setSaveError(r.error ?? "We couldn’t generate a synthesis. Try again, or contact your administrator if this persists.");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanBusy(false);
    }
  }

  async function regenerateFromAi() {
    if (!id) return;
    if (!aiPrompt.trim()) {
      setSaveError("Add an AI generation prompt below before regenerating.");
      return;
    }
    setAiDraftBusy(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const { page: row } = await expansion.landingPages.aiDraft(id, {
        prompt: aiPrompt.trim(),
        conversionGoal: conversionGoal.trim() || null,
        competitorBrief: competitorBrief.trim() || undefined,
        competitorUrlsText: competitorUrlsScan.trim() || undefined,
      });
      setPage(row);
      setPageData(normalizePageData(row.pageData));
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2500);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "AI regenerate failed");
    } finally {
      setAiDraftBusy(false);
    }
  }

  function patchFunnelStep(index: number, patch: Partial<LandingFunnelStep>) {
    setPageData((prev) => {
      const steps = [...(prev.funnelSteps ?? [])];
      steps[index] = { ...steps[index], ...patch };
      return { ...prev, funnelSteps: steps };
    });
  }

  function removeFunnelStep(index: number) {
    setPageData((prev) => ({
      ...prev,
      funnelSteps: (prev.funnelSteps ?? []).filter((_, i) => i !== index),
    }));
  }

  function addFunnelStep() {
    setPageData((prev) => ({
      ...prev,
      funnelSteps: [
        ...(prev.funnelSteps ?? []),
        {
          key: `section-${(prev.funnelSteps?.length ?? 0) + 1}`,
          title: "",
          body: "",
        },
      ],
    }));
  }

  function setStepBullets(index: number, raw: string) {
    const bullets = raw
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    patchFunnelStep(index, { bullets: bullets.length ? bullets : undefined });
  }

  function addFaq() {
    setPageData((prev) => ({
      ...prev,
      faq: [...(prev.faq ?? []), { q: "", a: "" }],
    }));
  }

  function patchFaq(index: number, patch: Partial<{ q: string; a: string }>) {
    setPageData((prev) => {
      const faq = [...(prev.faq ?? [])];
      faq[index] = { ...faq[index], ...patch };
      return { ...prev, faq };
    });
  }

  function removeFaq(index: number) {
    setPageData((prev) => ({
      ...prev,
      faq: (prev.faq ?? []).filter((_, i) => i !== index),
    }));
  }

  function updateField(
    key:
      | "headline"
      | "subheadline"
      | "body"
      | "ctaText"
      | "ctaUrl"
      | "formEmbedHtml"
      | "thankYouCopy"
      | "seoTitle"
      | "seoDescription"
      | "formPlacementNote"
      | "adGoalEcho",
    value: string
  ) {
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
        <main id="main-content" className="mx-auto max-w-3xl px-4 py-8">
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
      <main id="main-content" className="mx-auto max-w-3xl px-4 py-8">
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
            <h2 className="text-sm font-semibold text-zinc-900">Lead capture embed (HTML)</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Paste GoHighLevel (or other) iframe/embed code. AI positions copy relative to this when you generate — only paste snippets you trust.
            </p>
            <textarea
              value={pageData.formEmbedHtml ?? ""}
              onChange={(e) => updateField("formEmbedHtml", e.target.value)}
              rows={5}
              placeholder='<iframe src="https://link.example.com/widget/form/..." ...></iframe>'
              className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs text-zinc-900"
            />
          </div>

          <div className="border-t border-zinc-100 pt-6">
            <h2 className="text-sm font-semibold text-zinc-900">AI funnel sections</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Ordered sections for a full conversion path (hero → problem → proof → form bridge). Generated by AI; edit freely.
            </p>
            <div className="mt-4 space-y-4">
              {(pageData.funnelSteps ?? []).map((step, i) => (
                <div key={`${step.key ?? "step"}-${i}`} className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{step.key || `step-${i + 1}`}</span>
                    <button
                      type="button"
                      onClick={() => removeFunnelStep(i)}
                      className="text-xs text-red-700 hover:underline"
                    >
                      Remove section
                    </button>
                  </div>
                  <input
                    value={step.title ?? ""}
                    onChange={(e) => patchFunnelStep(i, { title: e.target.value })}
                    placeholder="Section title"
                    className="mt-2 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                  />
                  <textarea
                    value={step.body ?? ""}
                    onChange={(e) => patchFunnelStep(i, { body: e.target.value })}
                    placeholder="Body copy"
                    rows={4}
                    className="mt-2 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                  />
                  <label className="mt-2 block text-xs text-zinc-600">Bullets (one per line)</label>
                  <textarea
                    value={(step.bullets ?? []).join("\n")}
                    onChange={(e) => setStepBullets(i, e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 font-mono text-xs"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addFunnelStep}
                className="rounded-lg border border-dashed border-zinc-400 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                + Add funnel section
              </button>
            </div>
          </div>

          <div className="border-t border-zinc-100 pt-6">
            <h2 className="text-sm font-semibold text-zinc-900">Trust & FAQ</h2>
            <div className="mt-4 grid gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Trust signals (one per line)</label>
                <textarea
                  value={(pageData.trustSignals ?? []).join("\n")}
                  onChange={(e) =>
                    setPageData((prev) => ({
                      ...prev,
                      trustSignals: e.target.value
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    }))
                  }
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-3">
                {(pageData.faq ?? []).map((item, i) => (
                  <div key={`faq-${i}`} className="rounded-lg border border-zinc-200 p-3">
                    <div className="flex justify-end">
                      <button type="button" onClick={() => removeFaq(i)} className="text-xs text-red-700 hover:underline">
                        Remove
                      </button>
                    </div>
                    <input
                      value={item.q ?? ""}
                      onChange={(e) => patchFaq(i, { q: e.target.value })}
                      placeholder="Question"
                      className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                    <textarea
                      value={item.a ?? ""}
                      onChange={(e) => patchFaq(i, { a: e.target.value })}
                      placeholder="Answer"
                      rows={2}
                      className="mt-2 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addFaq}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  + Add FAQ pair
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-100 pt-6">
            <h2 className="text-sm font-semibold text-zinc-900">Thank-you & SEO</h2>
            <div className="mt-4 grid gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Thank-you / next-step copy</label>
                <textarea
                  value={pageData.thankYouCopy ?? ""}
                  onChange={(e) => updateField("thankYouCopy", e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-700">SEO title</label>
                  <input
                    value={pageData.seoTitle ?? ""}
                    onChange={(e) => updateField("seoTitle", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700">SEO description</label>
                  <input
                    value={pageData.seoDescription ?? ""}
                    onChange={(e) => updateField("seoDescription", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Form placement note (AI hint)</label>
                <input
                  value={pageData.formPlacementNote ?? ""}
                  onChange={(e) => updateField("formPlacementNote", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  placeholder='e.g. "Embedded form sits below proof section"'
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Ad goal echo (AI summary)</label>
                <input
                  value={pageData.adGoalEcho ?? ""}
                  onChange={(e) => updateField("adGoalEcho", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="Filled when AI generates"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-100 pt-6">
            <h2 className="text-sm font-semibold text-zinc-900">AI & tracking (optional)</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Competitor URLs to analyze</label>
                <textarea
                  value={competitorUrlsScan}
                  onChange={(e) => setCompetitorUrlsScan(e.target.value)}
                  rows={3}
                  placeholder="One URL per line (optional — fills research notes below)"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs"
                />
                <button
                  type="button"
                  disabled={scanBusy || !competitorUrlsScan.trim()}
                  onClick={() => void runUrlAnalysis()}
                  className="mt-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {scanBusy ? "Analyzing…" : "Run URL analysis"}
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Competitor research notes</label>
                <textarea
                  value={competitorBrief}
                  onChange={(e) => setCompetitorBrief(e.target.value)}
                  rows={6}
                  placeholder="Paste insights here, or run URL analysis above. Used when you regenerate headline/body with AI."
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">AI generation prompt</label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={3}
                  placeholder="Describe the offer, audience, and tone…"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={aiDraftBusy || !aiPrompt.trim()}
                  onClick={() => void regenerateFromAi()}
                  className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {aiDraftBusy ? "Regenerating…" : "Regenerate full funnel with AI"}
                </button>
                <p className="mt-1 text-xs text-zinc-500">
                  Rebuilds the whole funnel JSON (sections, hero, CTAs, FAQ, trust, SEO, thank-you). Existing HTML embed is preserved unless you replace it here and save before regenerating.
                </p>
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
