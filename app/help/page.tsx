"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { HelpPageShell } from "@/components/HelpPageShell";

const toc = [
  { id: "start", label: "First-time setup" },
  { id: "home", label: "Home" },
  { id: "campaign", label: "One campaign (edit & launch)" },
  { id: "manager", label: "Campaign Manager" },
  { id: "content", label: "Content strategy" },
  { id: "agency", label: "Agency & clients" },
  { id: "integrations", label: "Connecting ad accounts" },
  { id: "modules", label: "Extra features (when enabled)" },
  { id: "admin", label: "Admin (if you have access)" },
  { id: "problems", label: "When something goes wrong" },
] as const;

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-zinc-200/80 py-10 last:border-0">
      <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-zinc-700 sm:text-base">{children}</div>
    </section>
  );
}

export default function HelpPage() {
  return (
    <HelpPageShell>
      <main id="main-content" className="mx-auto max-w-3xl px-4 py-8 pb-20 sm:px-6">
        <p className="text-sm font-medium uppercase tracking-wide text-indigo-600">User guide</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">How to use SkyVault AI Allocation</h1>
        <p className="form-hint mt-3 max-w-2xl text-base">
          This guide is written so you do not need marketing or tech experience. Follow the steps in order the first time;
          after that, jump to any section from the list below.
        </p>

        <nav
          className="app-card mt-8"
          aria-label="On this page"
        >
          <p className="text-sm font-semibold text-slate-900">On this page</p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-indigo-800">
            {toc.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="underline decoration-indigo-300 underline-offset-2 hover:text-indigo-950">
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-4">
          <Section id="start" title="First-time setup">
            <ol className="list-decimal space-y-3 pl-5">
              <li>
                <strong>Create an account</strong> on the sign-up page with your email and a password (at least 8
                characters).
              </li>
              <li>
                After sign-up, you may be asked a <strong>few questions about your business</strong>. Answer in plain
                language — this helps AI and future features match your situation. You can skip and fill in later from the
                onboarding link.
              </li>
              <li>
                On <strong>Home</strong>, connect at least one ad platform you use (Meta, Google, TikTok, or LinkedIn) by
                clicking <strong>Connect</strong> and signing in to that platform when a new tab opens. You must stay logged
                into this app in the original tab.
              </li>
              <li>
                When at least one platform is connected, open <strong>New campaign</strong> on Home, fill the form, and
                click <strong>Create campaign</strong>. You will land on the campaign page where you can edit ads and
                launch.
              </li>
            </ol>
          </Section>

          <Section id="home" title="Home">
            <p>
              <strong>What it is:</strong> Your dashboard: connect ad accounts, manage a creative library, and start new
              campaigns.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Integration cards (top):</strong> Each card is one platform. <strong>Connect</strong> = link your ad
                account once. <strong>Connected</strong> = you can create and launch campaigns on that platform. Use the
                arrow to expand and see account names; <strong>Disconnect</strong> removes the link from this app only (it
                does not close your ad account on Meta/Google/etc.).
              </li>
              <li>
                <strong>Creative library:</strong> Upload image files. Those images can be attached to campaigns when you
                choose &quot;your own&quot; or &quot;mixed&quot; creatives. Supported formats: common web images (JPG, PNG,
                WebP, GIF) — not HEIC from iPhone without converting.
              </li>
              <li>
                <strong>Launch a campaign → New campaign:</strong> Pick one or more connected platforms, name the campaign,
                set how many ad <strong>variants</strong> (different texts) you want, and describe your offer in the{" "}
                <strong>Ad idea / prompt</strong> box. Set a <strong>total daily budget</strong> in dollars for the whole
                campaign (split across platforms if you pick more than one). Submit to create; you are taken to the
                campaign detail page.
              </li>
              <li>
                <strong>Your campaigns:</strong> A list of everything you created. Click a row to open that campaign and
                keep editing.
              </li>
            </ul>
          </Section>

          <Section id="campaign" title="One campaign (edit &amp; launch)">
            <p>
              <strong>What it is:</strong> Where you see every ad variant, edit text and images, set targeting (Meta), and
              push the campaign to a live ad account when you are ready.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Draft vs launched:</strong> <strong>Draft</strong> means not live on the ad network yet.{" "}
                <strong>Launched</strong> means you already sent it to a platform. You can still edit copy and many settings
                depending on the platform.
              </li>
              <li>
                <strong>Creative direction:</strong> Describes how generated images should look. Save, then use redesign
                buttons if the app offers them, to apply to selected variants.
              </li>
              <li>
                <strong>Target audience (Meta only):</strong> Describe the audience in English. The app turns that into
                location, age, and gender for Meta. Use <strong>Preview</strong> to see what will be sent. Save before
                launch.
              </li>
              <li>
                <strong>Ad variants:</strong> Each block is one ad. Edit the text, save per variant, attach an image
                (upload, library, or generate if available). Reorder with drag if shown.
              </li>
              <li>
                <strong>Launch section:</strong> Choose your <strong>ad account</strong> (and for Meta/TikTok/Google/LinkedIn,
                the fields shown — e.g. LinkedIn needs a Company Page id and a landing page URL). Pick which variants to
                include, then <strong>Launch (live)</strong> to spend, or <strong>dry run</strong> if offered to test without
                spend. Read any yellow notes — LinkedIn in particular may create <strong>draft</strong> objects; open{" "}
                <strong>Campaign Manager</strong> in the <strong>same ad account</strong> the app used (use the link we
                show if the number is on file).
              </li>
            </ul>
            <p className="rounded-lg bg-amber-50/90 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-200/80">
              <strong>Tip:</strong> If you are lost, do only this: (1) Connect one platform on Home, (2) Create one
              campaign, (3) On the campaign page add images and text, (4) Open the launch section and fill every required
              field, (5) Launch dry run or live. Ignore everything else until that works.
            </p>
          </Section>

          <Section id="manager" title="Campaign Manager">
            <p>
              <strong>What it is:</strong> A list view of your campaigns, sometimes grouped if you created one idea across
              several platforms. Click through to a grouped detail page. Creating new work still starts from{" "}
              <Link href="/" className="font-medium text-indigo-700 underline">
                Home → New campaign
              </Link>
              .
            </p>
          </Section>

          <Section id="content" title="Content strategy">
            <p>
              <strong>What it is:</strong> A separate tool that asks Claude to plan social-style content (not the same as
              “launch a paid ad,” but it can match your business profile if you completed onboarding).
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Write a short note about what you want (topic, month, channel).</li>
              <li>Choose how much the AI should write (full copy vs ideas only) and the time range (one post, a week, a month).</li>
              <li>Click generate and read the result; copy it into your real social schedulers or docs.</li>
            </ol>
            <p>
              <strong>Backend:</strong> Needs <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs">ANTHROPIC_API_KEY</code> on the
              server.
            </p>
          </Section>

          <Section id="agency" title="Agency &amp; clients">
            <p>
              <strong>What it is:</strong> If your account type is <strong>agency</strong>, you can add client emails and
              <strong> view as a client</strong> so ad connections and campaigns belong to that client’s workspace.
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Open <strong>Select client / Switch client</strong> in the nav, add a client, then <strong>View as
                client</strong>.
              </li>
              <li>
                <strong>Business profile and content strategy</strong> use the <strong>current</strong> client or your agency
                — see the on-screen note. Set your <strong>agency’s</strong> own profile from the agency page (clear “view as”
                first) if that button is available.
              </li>
            </ol>
          </Section>

          <Section id="integrations" title="Connecting ad accounts">
            <p>
              OAuth opens in a new window or tab. You must return to <strong>this</strong> app. If something fails, check:{" "}
              <strong>BACKEND_URL</strong> and <strong>FRONTEND_URL</strong> in your deployment, and that the redirect URL in
              Meta / Google / TikTok / LinkedIn developer settings matches <code className="rounded bg-zinc-200 px-1.5">BACKEND_URL/integrations/&lt;platform&gt;/callback</code>.
            </p>
            <p>
              The Home page also shows a longer hint when an error is passed in the URL after a failed return.
            </p>
          </Section>

          <Section id="modules" title="Extra features (when enabled)">
            <p>
              Some items in the top bar only show if your workspace has those products enabled: <strong>White label</strong>,{" "}
              <strong>Kits</strong>, <strong>DFY</strong>, <strong>Landing pages</strong>, <strong>Reports</strong>,{" "}
              <strong>Competitors</strong>. If you are an agency and do not see one you expect, ask the person who
              administers your account. <strong>Admin</strong> in the bar is for internal operators only.
            </p>
            <p>
              <strong>Kits</strong> and parts of the expansion set may still be partial UIs; the <strong>Help</strong> page
              is the supported guide — feature-specific docs may be added as those screens are finished.
            </p>
          </Section>

          <Section id="admin" title="Admin (if you have access)">
            <p>
              <strong>What it is:</strong> A separate dashboard for operators and platform owners, not for typical advertisers.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                You only see <strong>Admin</strong> in the top bar if your email is allowed in the backend (for example via{" "}
                <code className="rounded bg-zinc-200 px-1.5">ADMIN_EMAILS</code>). It is for user lists, product toggles, and
                diagnostics.
              </li>
              <li>Day-to-day ad work is done on <strong>Home</strong> and on each <strong>campaign</strong> page, not in Admin.</li>
            </ul>
          </Section>

          <Section id="problems" title="When something goes wrong">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>“Database” or login errors after an update:</strong> Your host may need a schema sync. Whoever runs
                the backend should run <code className="rounded bg-zinc-200 px-1.5">npx prisma db push</code> against the
                same database your app uses, or add missing columns in the Neon SQL editor (see your team’s runbook).
              </li>
              <li>
                <strong>Empty ad account list:</strong> Reconnect the integration; confirm you use the ad account on the
                right business profile. For LinkedIn, scopes and “Marketing / Ads” product must be approved for your app.
              </li>
              <li>
                <strong>Launch fails with a long error message:</strong> Read the first clear sentence; it often names a
                missing field (URL, page id, account id). Fix that on the campaign page and try again.
              </li>
            </ul>
            <p>
              <Link href="/contact" className="font-medium text-indigo-700 underline">
                Contact
              </Link>{" "}
              the team that gave you this product for account-specific or billing questions.
            </p>
          </Section>
        </div>
      </main>
    </HelpPageShell>
  );
}
