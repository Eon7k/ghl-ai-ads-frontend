"use client";

import { useMemo } from "react";
import type { LandingFunnelStep, LandingPageData } from "@/lib/api";

type FieldKey =
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
  | "adGoalEcho";

export type LandingPageDesignCanvasProps = {
  pageData: LandingPageData;
  updateField: (key: FieldKey, value: string) => void;
  patchFunnelStep: (index: number, patch: Partial<LandingFunnelStep>) => void;
  removeFunnelStep: (index: number) => void;
  addFunnelStep: () => void;
  setStepBullets: (index: number, raw: string) => void;
  patchFaq: (index: number, patch: Partial<{ q: string; a: string }>) => void;
  removeFaq: (index: number) => void;
  addFaq: () => void;
  setTrustSignalsFromLines: (lines: string[]) => void;
};

/** Visitor-style landing layout with inline editable fields (no separate “code view”). */
export default function LandingPageDesignCanvas({
  pageData,
  updateField,
  patchFunnelStep,
  removeFunnelStep,
  addFunnelStep,
  setStepBullets,
  patchFaq,
  removeFaq,
  addFaq,
  setTrustSignalsFromLines,
}: LandingPageDesignCanvasProps) {
  const funnelIndexes = useMemo(() => {
    const rawSteps = pageData.funnelSteps ?? [];
    const pairs: { step: LandingFunnelStep; index: number }[] = [];
    rawSteps.forEach((step, index) => {
      const k = (step.key ?? "").trim().toLowerCase();
      if (k === "hero") return;
      pairs.push({ step, index });
    });
    return pairs;
  }, [pageData.funnelSteps]);

  const headline = pageData.headline ?? "";
  const subheadline = pageData.subheadline ?? "";
  const body = pageData.body ?? "";

  return (
    <div className="landing-design-root rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-200/60 ring-1 ring-black/5">
      <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Design preview — click Save to persist changes</p>
        <p className="mt-1 text-[11px] leading-snug text-zinc-400">
          A funnel step with key <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-[10px] text-zinc-700">hero</code> matches
          the headline area above and is not repeated in the sections list.
        </p>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-950 via-zinc-900 to-zinc-950 px-6 py-14 md:px-12 md:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.35),transparent_55%)]" />
        <div className="relative mx-auto max-w-3xl">
          <label className="mb-6 flex flex-wrap items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-300">Goal line</span>
            <input
              value={pageData.adGoalEcho ?? ""}
              onChange={(e) => updateField("adGoalEcho", e.target.value)}
              className="min-w-[10rem] flex-1 border-b border-transparent bg-transparent text-sm font-medium text-white outline-none placeholder:text-violet-300/60 focus:border-violet-400"
              placeholder="e.g. Book a strategy call"
            />
          </label>
          <label className="block">
            <span className="sr-only">Headline</span>
            <textarea
              value={headline}
              onChange={(e) => updateField("headline", e.target.value)}
              rows={Math.min(6, Math.max(2, headline.split("\n").length || 2))}
              placeholder="Headline — big promise visitors see first"
              className="w-full resize-none bg-transparent text-3xl font-bold leading-tight tracking-tight text-white placeholder:text-zinc-500 focus:outline-none focus:ring-0 md:text-4xl lg:text-5xl"
            />
          </label>
          <label className="mt-5 block">
            <span className="sr-only">Subheadline</span>
            <textarea
              value={subheadline}
              onChange={(e) => updateField("subheadline", e.target.value)}
              rows={Math.min(5, Math.max(2, subheadline.split("\n").length || 2))}
              placeholder="Supporting line — clarify who it’s for and what they get"
              className="w-full resize-none bg-transparent text-lg leading-relaxed text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-0 md:text-xl"
            />
          </label>
          <label className="mt-8 block">
            <span className="sr-only">Lead paragraph</span>
            <textarea
              value={body}
              onChange={(e) => updateField("body", e.target.value)}
              rows={Math.min(12, Math.max(4, body.split("\n").length || 4))}
              placeholder="Hero body — expand on the offer (paragraphs)."
              className="w-full resize-none bg-transparent text-base leading-relaxed text-zinc-400 placeholder:text-zinc-600 focus:outline-none focus:ring-0"
            />
          </label>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="flex flex-1 flex-col gap-1 sm:max-w-xs">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-300">Button label</span>
              <input
                value={pageData.ctaText ?? ""}
                onChange={(e) => updateField("ctaText", e.target.value)}
                className="rounded-xl border border-white/25 bg-white px-5 py-3 text-center text-base font-semibold text-violet-950 shadow-lg placeholder:text-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/40"
                placeholder="Get started"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 sm:min-w-[200px]">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-300">Button link</span>
              <input
                value={pageData.ctaUrl ?? ""}
                onChange={(e) => updateField("ctaUrl", e.target.value)}
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
                placeholder="https://… or /thank-you"
              />
            </label>
          </div>

          <label className="mt-8 block rounded-lg border border-white/10 bg-white/5 p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Form placement note</span>
            <input
              value={pageData.formPlacementNote ?? ""}
              onChange={(e) => updateField("formPlacementNote", e.target.value)}
              className="mt-1 w-full bg-transparent text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none"
              placeholder="e.g. Form sits below proof section"
            />
          </label>
        </div>
      </section>

      {/* Funnel sections */}
      {funnelIndexes.map(({ step, index }, visualRank) => {
        const zebra = visualRank % 2 === 0;
        return (
          <section
            key={`${step.key ?? "step"}-${index}`}
            className={`border-t border-zinc-100 px-6 py-12 md:px-12 ${zebra ? "bg-white" : "bg-zinc-50/90"}`}
          >
            <div className="mx-auto max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-md bg-violet-100 px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide text-violet-800">
                  {(step.key ?? "").trim() || `section-${visualRank + 1}`}
                </span>
                <button
                  type="button"
                  onClick={() => removeFunnelStep(index)}
                  className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline"
                >
                  Remove section
                </button>
              </div>
              <label className="block">
                <span className="sr-only">Section title</span>
                <textarea
                  value={step.title ?? ""}
                  onChange={(e) => patchFunnelStep(index, { title: e.target.value })}
                  rows={Math.min(3, Math.max(1, (step.title ?? "").split("\n").length))}
                  placeholder="Section headline"
                  className="w-full resize-none bg-transparent text-2xl font-semibold tracking-tight text-zinc-900 placeholder:text-zinc-400 focus:outline-none md:text-3xl"
                />
              </label>
              <label className="mt-5 block">
                <span className="sr-only">Section body</span>
                <textarea
                  value={step.body ?? ""}
                  onChange={(e) => patchFunnelStep(index, { body: e.target.value })}
                  rows={Math.min(14, Math.max(4, (step.body ?? "").split("\n").length || 4))}
                  placeholder="Paragraphs for this section."
                  className="w-full resize-none bg-transparent text-base leading-relaxed text-zinc-600 placeholder:text-zinc-400 focus:outline-none"
                />
              </label>
              <div className="mt-6 rounded-xl border border-dashed border-zinc-200 bg-white/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Bullet points</p>
                <p className="mt-1 text-xs text-zinc-400">One line per bullet — shown as a list below.</p>
                {(step.bullets?.length ?? 0) > 0 ? (
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-zinc-700 marker:text-violet-500">
                    {(step.bullets ?? []).map((b, bi) => (
                      <li key={`${bi}-${b.slice(0, 16)}`}>{b}</li>
                    ))}
                  </ul>
                ) : null}
                <textarea
                  value={(step.bullets ?? []).join("\n")}
                  onChange={(e) => setStepBullets(index, e.target.value)}
                  rows={4}
                  className="mt-4 w-full rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                  placeholder={"Outcome one\nOutcome two"}
                />
              </div>
            </div>
          </section>
        );
      })}

      <div className="border-t border-zinc-100 bg-zinc-50 px-6 py-6 md:px-12">
        <button
          type="button"
          onClick={addFunnelStep}
          className="mx-auto flex max-w-3xl rounded-xl border-2 border-dashed border-zinc-300 px-6 py-4 text-sm font-medium text-zinc-600 hover:border-violet-400 hover:bg-white hover:text-violet-900"
        >
          + Add funnel section
        </button>
      </div>

      {/* Trust */}
      <section className="border-t border-zinc-200 bg-white px-6 py-12 md:px-12">
        <div className="mx-auto max-w-3xl">
          <h3 className="text-center text-sm font-semibold uppercase tracking-wide text-zinc-500">Trust & credibility</h3>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {(pageData.trustSignals ?? []).length === 0 ? (
              <p className="text-sm text-zinc-400">Add signals below — they appear as chips.</p>
            ) : (
              (pageData.trustSignals ?? []).map((t, i) => (
                <span
                  key={`${i}-${t.slice(0, 24)}`}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm"
                >
                  {t}
                </span>
              ))
            )}
          </div>
          <label className="mt-8 block">
            <span className="text-xs font-medium text-zinc-600">Edit signals (one per line)</span>
            <textarea
              value={(pageData.trustSignals ?? []).join("\n")}
              onChange={(e) =>
                setTrustSignalsFromLines(
                  e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
              rows={5}
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
              placeholder={"ISO certified\n500+ happy clients"}
            />
          </label>
        </div>
      </section>

      {/* Lead form */}
      <section className="border-t border-zinc-200 bg-gradient-to-b from-zinc-50 to-white px-6 py-14 md:px-12">
        <div className="mx-auto max-w-xl">
          <h3 className="text-center text-2xl font-bold text-zinc-900">Lead capture</h3>
          <p className="mt-2 text-center text-sm text-zinc-500">
            Paste your GoHighLevel or other embed — preview updates here (same as visitors will see when published).
          </p>
          {(pageData.formEmbedHtml ?? "").trim() ? (
            <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-inner">
              {/* Trusted agency-only editor context — mirrors published embed */}
              <div className="landing-embed-preview overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50/50 [&_iframe]:max-h-[520px] [&_iframe]:min-h-[240px] [&_iframe]:w-full">
                {/* eslint-disable-next-line react/no-danger */}
                <div dangerouslySetInnerHTML={{ __html: pageData.formEmbedHtml ?? "" }} />
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border-2 border-dashed border-zinc-200 bg-white px-8 py-16 text-center">
              <p className="text-sm text-zinc-500">No embed yet — paste HTML below.</p>
            </div>
          )}
          <details className="group mt-6 rounded-xl border border-zinc-200 bg-white open:shadow-md">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              Embed HTML
            </summary>
            <textarea
              value={pageData.formEmbedHtml ?? ""}
              onChange={(e) => updateField("formEmbedHtml", e.target.value)}
              rows={8}
              className="w-full border-t border-zinc-100 bg-zinc-50 px-4 py-3 font-mono text-xs leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
              spellCheck={false}
              placeholder='<iframe src="https://..." ...></iframe>'
            />
          </details>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-zinc-200 bg-white px-6 py-14 md:px-12">
        <div className="mx-auto max-w-3xl">
          <h3 className="text-center text-sm font-semibold uppercase tracking-wide text-zinc-500">Questions</h3>
          <div className="mt-10 space-y-4">
            {(pageData.faq ?? []).length === 0 ? (
              <p className="text-center text-sm text-zinc-400">No FAQs yet — add pairs below.</p>
            ) : (
              (pageData.faq ?? []).map((item, i) => (
                <div key={`faq-${i}`} className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-5 shadow-sm">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeFaq(i)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    value={item.q ?? ""}
                    onChange={(e) => patchFaq(i, { q: e.target.value })}
                    placeholder="Question"
                    className="mt-1 w-full bg-transparent text-lg font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                  />
                  <textarea
                    value={item.a ?? ""}
                    onChange={(e) => patchFaq(i, { a: e.target.value })}
                    placeholder="Answer"
                    rows={3}
                    className="mt-3 w-full resize-none bg-transparent text-sm leading-relaxed text-zinc-600 placeholder:text-zinc-400 focus:outline-none"
                  />
                </div>
              ))
            )}
            <button
              type="button"
              onClick={addFaq}
              className="w-full rounded-xl border border-dashed border-zinc-300 py-3 text-sm font-medium text-zinc-600 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-900"
            >
              + Add FAQ
            </button>
          </div>
        </div>
      </section>

      {/* Thank you + SEO */}
      <section className="border-t border-zinc-200 bg-zinc-900 px-6 py-14 text-zinc-100 md:px-12">
        <div className="mx-auto max-w-3xl space-y-10">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">After submit</h3>
            <textarea
              value={pageData.thankYouCopy ?? ""}
              onChange={(e) => updateField("thankYouCopy", e.target.value)}
              rows={4}
              placeholder="Thank-you message or next step after someone converts."
              className="mt-3 w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950/80 px-4 py-3 text-base leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
          </div>
          <div className="grid gap-6 border-t border-zinc-800 pt-10 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">SEO title</span>
              <input
                value={pageData.seoTitle ?? ""}
                onChange={(e) => updateField("seoTitle", e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
                placeholder="≤70 characters"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">SEO description</span>
              <textarea
                value={pageData.seoDescription ?? ""}
                onChange={(e) => updateField("seoDescription", e.target.value)}
                rows={2}
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
                placeholder="≤160 characters"
              />
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}
