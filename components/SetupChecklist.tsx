"use client";

import Link from "next/link";

type Step = {
  id: string;
  done: boolean;
  label: string;
  hint?: string;
  href: string;
  cta: string;
};

export function SetupChecklist({
  hasIntegration,
  hasCampaign,
  canCompetitors,
  hasCompetitorWatch,
  canLandingPages,
  hasLandingPage,
}: {
  hasIntegration: boolean;
  hasCampaign: boolean;
  canCompetitors: boolean;
  hasCompetitorWatch: boolean;
  canLandingPages: boolean;
  hasLandingPage: boolean;
}) {
  const steps: Step[] = [
    {
      id: "ad",
      done: hasIntegration,
      label: "Connect an ad account",
      hint: "Meta, Google, TikTok, or LinkedIn — so you can run real campaigns from here.",
      href: "/#main-content",
      cta: "Connect",
    },
    {
      id: "camp",
      done: hasCampaign,
      label: "Create a campaign (draft is fine)",
      href: "/#launch-campaign",
      cta: "New campaign",
    },
    {
      id: "lp",
      done: canLandingPages ? hasLandingPage : true,
      label: "Create a client landing page",
      hint: "When your plan includes the landing page builder.",
      href: "/landing-pages",
      cta: "Landing pages",
    },
    {
      id: "comp",
      done: canCompetitors ? hasCompetitorWatch : true,
      label: "Run a competitor watch",
      hint: "We analyze their site, optional public Meta ads, and AI counter-angles.",
      href: "/competitors",
      cta: "Competitors",
    },
  ].filter((s) => s.id !== "lp" || canLandingPages);

  const total = steps.length;
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === total) return null;

  return (
    <section
      className="mb-6 rounded-2xl border border-zinc-200/90 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm shadow-zinc-900/5"
      aria-labelledby="setup-checklist-title"
    >
      <h2 id="setup-checklist-title" className="text-sm font-semibold text-zinc-900">
        Account setup — {doneCount}/{total} complete
      </h2>
      <p className="mt-1 text-xs text-zinc-500">Finish the steps below in order, or pick what you need. You can return anytime.</p>
      <ol className="mt-3 space-y-2">
        {steps.map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-100 bg-white/80 px-3 py-2 text-sm"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  s.done ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-600"
                }`}
                aria-hidden
              >
                {s.done ? "✓" : "○"}
              </span>
              <div className="min-w-0">
                <span className="font-medium text-zinc-900">{s.label}</span>
                {s.hint && <p className="text-xs text-zinc-500">{s.hint}</p>}
              </div>
            </div>
            <Link
              href={s.href}
              className="shrink-0 rounded-lg bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-800"
            >
              {s.cta}
            </Link>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-zinc-500">
        <Link href="/content-strategy" className="font-medium text-violet-700 hover:underline">Content strategy</Link> (organic) ·{" "}
        <Link href="/#integrations-bar" className="font-medium text-violet-700 hover:underline">Ad connections</Link> ·{" "}
        <Link href="/help" className="font-medium text-violet-700 hover:underline">Help</Link> ·{" "}
        <Link href="/manager" className="font-medium text-violet-700 hover:underline">Campaign manager</Link>
      </p>
    </section>
  );
}
