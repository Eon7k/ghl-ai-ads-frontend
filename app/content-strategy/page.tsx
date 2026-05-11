"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { api, type ConnectedIntegration } from "@/lib/api";
import { PageGuide } from "@/components/PageGuide";
import { fileToUploadableDataUrl, isHeicFile, isLikelyImageFile } from "@/lib/imageUpload";

type Mode = "full" | "text_plus_prompts" | "ideas_only";
type Horizon = "single" | "week" | "month";

export default function ContentStrategyPage() {
  const { businessModelProfile, businessOnboardingComplete, loading, user, accountType, businessProfileForEmail, isAdmin } =
    useAuth();
  const subject = businessProfileForEmail || user?.email || "";
  const isClientContext = accountType === "agency" && user?.email && subject && subject !== user.email;
  const [userPrompt, setUserPrompt] = useState("");
  const [mode, setMode] = useState<Mode>("full");
  const [horizon, setHorizon] = useState<Horizon>("week");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [integrations, setIntegrations] = useState<ConnectedIntegration[]>([]);
  const [linkedinOrgUrn, setLinkedinOrgUrn] = useState("");
  const [organicText, setOrganicText] = useState("");
  const [organicImageDataUrl, setOrganicImageDataUrl] = useState<string | null>(null);
  const [organicImageName, setOrganicImageName] = useState<string | null>(null);
  const [organicLoading, setOrganicLoading] = useState(false);
  const [organicError, setOrganicError] = useState<string | null>(null);
  const [organicSuccess, setOrganicSuccess] = useState<string | null>(null);

  const [ghlConfigured, setGhlConfigured] = useState<boolean | null>(null);
  const [ghlCsv, setGhlCsv] = useState<string | null>(null);
  const [ghlGenLoading, setGhlGenLoading] = useState(false);
  const [ghlPushLoading, setGhlPushLoading] = useState(false);
  const [ghlPushMsg, setGhlPushMsg] = useState<string | null>(null);
  const [ghlImageNote, setGhlImageNote] = useState<string | null>(null);

  const [includeAiImages, setIncludeAiImages] = useState(true);
  const [planImages, setPlanImages] = useState<{ index: number; postAtSpecificTime: string; imageUrl: string | null }[]>(
    []
  );
  const [planImageErrors, setPlanImageErrors] = useState<string[]>([]);
  const [organicAiImageLoading, setOrganicAiImageLoading] = useState(false);
  /** Shown while polling long-running content jobs (DALL-E batch). */
  const [jobProgress, setJobProgress] = useState<string | null>(null);

  const profileSkipped = Boolean(
    businessModelProfile && (businessModelProfile as { skipped?: boolean }).skipped === true
  );
  const hasUsefulProfile = businessOnboardingComplete === true && !profileSkipped;
  const linkedInConnected = integrations.some((i) => i.platform === "linkedin");

  useEffect(() => {
    if (typeof window === "undefined" || !user) return;
    const saved = window.sessionStorage.getItem("linkedinContentOrgUrn");
    if (saved) setLinkedinOrgUrn(saved);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    api.integrations
      .list()
      .then((r) => setIntegrations(r))
      .catch(() => setIntegrations([]));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    api.integrations
      .getGhlSocialPlanner()
      .then((r) => {
        setGhlConfigured(r.configured);
      })
      .catch(() => setGhlConfigured(false));
  }, [user]);

  function stripMarkdownForCaption(md: string): string {
    return md
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/^#+\s.*/gm, " ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
  }

  async function generate() {
    setGenLoading(true);
    setError(null);
    setResult(null);
    setPlanImages([]);
    setPlanImageErrors([]);
    setJobProgress(null);
    try {
      const r = await api.contentStrategy.generate({
        userPrompt,
        mode,
        horizon,
        generateImages: includeAiImages,
      });
      if ("jobId" in r && r.jobId) {
        setJobProgress("Queued…");
        const done = await api.contentStrategy.pollJobUntilComplete(r.jobId, (p, st) => {
          setJobProgress(p || (st === "running" ? "Working…" : st));
        });
        setResult(done.markdown ?? "");
        const gi = done.generatedImages;
        setPlanImages(
          Array.isArray(gi)
            ? gi.filter(
                (x): x is { index: number; postAtSpecificTime: string; imageUrl: string | null } =>
                  Boolean(x && typeof x.index === "number" && typeof x.postAtSpecificTime === "string" && x.imageUrl)
              )
            : []
        );
        const ie = done.imageErrors;
        setPlanImageErrors(Array.isArray(ie) ? ie : []);
      } else if ("markdown" in r) {
        setResult(r.markdown);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenLoading(false);
      setJobProgress(null);
    }
  }

  async function generateForGhl() {
    setGhlGenLoading(true);
    setError(null);
    setGhlPushMsg(null);
    setGhlCsv(null);
    setGhlImageNote(null);
    setJobProgress(null);
    try {
      const r = await api.contentStrategy.generateForGhl({
        userPrompt,
        mode,
        horizon,
        generateImages: includeAiImages,
      });
      if ("jobId" in r && r.jobId) {
        setJobProgress("Queued…");
        const done = await api.contentStrategy.pollJobUntilComplete(r.jobId, (p, st) => {
          setJobProgress(p || (st === "running" ? "Working…" : st));
        });
        setGhlCsv(done.csv ?? "");
        const ie = done.imageErrors;
        if (Array.isArray(ie) && ie.length) {
          setGhlImageNote(
            `Some images failed (${ie.length}). Rows still export; check missing imageUrls in CSV.`
          );
        }
      } else if ("csv" in r) {
        setGhlCsv(r.csv);
        if (r.imageErrors?.length) {
          setGhlImageNote(
            `Some images failed (${r.imageErrors.length}). Rows still export; check missing imageUrls in CSV.`
          );
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "CSV generation failed");
    } finally {
      setGhlGenLoading(false);
      setJobProgress(null);
    }
  }

  function downloadGhlCsv() {
    if (!ghlCsv) return;
    const blob = new Blob([ghlCsv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ghl-social-planner-basic.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function pushGhlCsv() {
    if (!ghlCsv?.trim()) {
      setError("Generate CSV for Go High Level first (or paste CSV server-side flow expects Basic template).");
      return;
    }
    setGhlPushLoading(true);
    setError(null);
    setGhlPushMsg(null);
    try {
      const r = await api.integrations.pushGhlSocialPlannerCsv(ghlCsv);
      setGhlPushMsg(r.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Push to Go High Level failed");
    } finally {
      setGhlPushLoading(false);
    }
  }

  async function generateAiImageForLinkedIn() {
    setOrganicError(null);
    const textToUse = organicText.trim() || (result ? stripMarkdownForCaption(result) : "");
    if (!textToUse) {
      setOrganicError("Add post text, or generate a plan first, so we have a caption to illustrate.");
      return;
    }
    setOrganicAiImageLoading(true);
    try {
      const r = await api.contentStrategy.generateOrganicImage({
        caption: textToUse.slice(0, 2000),
      });
      setOrganicImageDataUrl(r.imageDataUrl);
      setOrganicImageName("ai-generated.png");
    } catch (e) {
      setOrganicError(e instanceof Error ? e.message : "Could not generate image");
    } finally {
      setOrganicAiImageLoading(false);
    }
  }

  async function postToLinkedInOrganic() {
    setOrganicError(null);
    setOrganicSuccess(null);
    setOrganicLoading(true);
    try {
      const textToSend =
        organicText.trim() ||
        (result || "")
          .replace(/```[\s\S]*?```/g, " ")
          .replace(/^#+\s.*/gm, " ")
          .trim();
      if (!textToSend) {
        setOrganicError("Add post text, or generate content first so we can send it.");
        return;
      }
      const r = await api.integrations.postLinkedInOrganic({
        organizationUrn: linkedinOrgUrn.trim(),
        text: textToSend,
        imageBase64: organicImageDataUrl,
      });
      setOrganicSuccess(r.message);
      if (typeof window !== "undefined" && linkedinOrgUrn.trim()) {
        window.sessionStorage.setItem("linkedinContentOrgUrn", linkedinOrgUrn.trim());
      }
    } catch (e) {
      setOrganicError(e instanceof Error ? e.message : "Could not post to LinkedIn");
    } finally {
      setOrganicLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-zinc-600">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 pb-20">
      <h1 className="text-2xl font-bold text-zinc-900">Content strategy</h1>
      <PageGuide
        className="mt-4"
        title="How to use this page"
        steps={[
          "This is for organic social content ideas and copy — not the same as launching a paid ad campaign. Paid ads are created from Home and edited on a campaign page.",
          "Type what you need (topic, time window, product launch, tone). Choose whether you want full posts, text plus a to-do list, or ideas only, and pick a time range.",
          "Optional: keep “Include AI images” on — work runs on the server in the background (with progress text) so long DALL·E batches don’t time out your browser.",
          "For Go High Level: an administrator saves Location id + Private Integration token per portal account (Admin tab). Then generate CSV here and Push or download — Marketing → Social Planner.",
          "If LinkedIn is connected, use the “Post to LinkedIn” section to publish to your Company Page, or still copy the result anywhere you like. The business profile (link below) gives the AI more context about your business.",
        ]}
      />
      {isClientContext && (
        <p className="mt-2 rounded-md border border-violet-200 bg-violet-50/80 px-2 py-1.5 text-sm text-violet-950">
          Plans use the <strong>client</strong> profile and context for <span className="font-mono text-xs">{subject}</span>.{" "}
          Your agency login is separate — change who you act as on{" "}
          <Link className="font-medium text-violet-900 underline" href="/agency">Agency clients</Link>.
        </p>
      )}
      <p className="form-hint mt-2 max-w-2xl">
        Claude uses the saved business model for this scope (if any) plus the notes below. Set{" "}
        <Link className="text-blue-700 underline" href="/onboarding/business?edit=1">
          the business profile
        </Link>{" "}
        for better output.
      </p>

      {!hasUsefulProfile && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-950">
          {profileSkipped
            ? "You previously skipped the business profile. The AI can still work from the notes you add below — or "
            : "We do not have a full business profile. Add context below, or "}
          <Link className="font-medium text-amber-950 underline" href="/onboarding/business?edit=1">
            {profileSkipped ? "update your business profile" : "complete the questionnaire"}
          </Link>{" "}
          for more tailored output.
        </div>
      )}

      {hasUsefulProfile && businessModelProfile && (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 text-xs text-zinc-700">
          <p className="font-medium text-zinc-800">Profile on file (passed to Claude)</p>
          <p className="mt-1 font-mono text-[11px] whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
            {JSON.stringify(businessModelProfile, null, 2)}
          </p>
        </div>
      )}

      <div className="mt-6 space-y-4">
        <div>
          <label className="form-label" htmlFor="content-strategy-prompt">
            Context or focus for this run
          </label>
          <textarea
            id="content-strategy-prompt"
            className="app-textarea mt-1"
            rows={4}
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="e.g. Launch a new membership tier in March; emphasize trust and speed; we post on LinkedIn 3x per week…"
          />
        </div>

        <div>
          <p className="text-sm font-medium text-zinc-800">What should the AI produce?</p>
          <div className="mt-2 space-y-2">
            <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-800">
              <input type="radio" name="mode" checked={mode === "full"} onChange={() => setMode("full")} />
              <span>
                <span className="font-medium">Full content</span> — ready-to-post copy (and light creative notes) for each
                slot
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-800">
              <input
                type="radio"
                name="mode"
                checked={mode === "text_plus_prompts"}
                onChange={() => setMode("text_plus_prompts")}
              />
              <span>
                <span className="font-medium">Text + your checklist</span> — post text for each day/slot, plus what you
                need to create (photos, video, design)
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-800">
              <input type="radio" name="mode" checked={mode === "ideas_only"} onChange={() => setMode("ideas_only")} />
              <span>
                <span className="font-medium">Ideas only</span> — themes and hooks; you write everything
              </span>
            </label>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-zinc-800">Time horizon</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {(
              [
                { id: "single" as const, label: "One post" },
                { id: "week" as const, label: "One week" },
                { id: "month" as const, label: "About a month" },
              ] as const
            ).map((h) => (
              <label
                key={h.id}
                className="flex cursor-pointer items-center gap-2 rounded border border-zinc-200 bg-white px-3 py-2 text-sm"
              >
                <input
                  type="radio"
                  name="horizon"
                  checked={horizon === h.id}
                  onChange={() => setHorizon(h.id)}
                />
                {h.label}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-3">
          <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-800">
            <input
              type="checkbox"
              checked={includeAiImages}
              onChange={(e) => setIncludeAiImages(e.target.checked)}
              className="mt-1 rounded border-zinc-400"
            />
            <span>
              <span className="font-medium">Include AI images (DALL·E)</span> — one image per scheduled slot for the Go High
              Level CSV and thumbnails below your markdown plan (uses OpenAI alongside Claude). This runs as a{" "}
              <strong>background job</strong> with live status text so requests don&apos;t time out in the browser. Uncheck for
              text-only output (faster and cheaper).
            </span>
          </label>
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={genLoading}
          className="rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-50"
        >
          {genLoading
            ? jobProgress ||
              (includeAiImages ? "Starting (background job)…" : "Generating with Claude…")
            : "Generate plan"}
        </button>
      </div>

      <section className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
        <h2 className="text-base font-semibold text-emerald-950">Go High Level — Social Planner CSV</h2>
        <p className="form-hint mt-1 max-w-2xl text-emerald-950/90">
          Claude builds rows matching HighLevel&apos;s <strong>Basic CSV</strong> (scheduled time, caption, optional link, and when enabled,{" "}
          <strong>image URLs</strong> HighLevel can fetch). Only an <strong>administrator</strong> can attach each
          workspace&apos;s Location id and Private Integration token (
          <Link href="/admin" className="font-medium text-emerald-900 underline">
            Admin → Go High Level
          </Link>
          ). Then use <strong>Push</strong> here or download and import under{" "}
          <span className="font-medium">Marketing → Social Planner → Upload from CSV</span>.
        </p>
        <p className="mt-2 text-xs text-emerald-900/90">
          Docs:{" "}
          <a
            href="https://help.gohighlevel.com/support/solutions/articles/155000005411-prerequisite-for-bulk-csv-basic-and-advance-csv"
            className="font-medium underline"
            target="_blank"
            rel="noreferrer"
          >
            Bulk CSV prerequisites (HighLevel)
          </a>
          {" · "}
          Private Integration needs Social Planner–related scopes (HighLevel → Settings → Integrations → API).
        </p>

        <div className="mt-6 flex flex-wrap gap-3 border-t border-emerald-200/80 pt-4">
          <button
            type="button"
            onClick={() => void generateForGhl()}
            disabled={ghlGenLoading}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-emerald-950 shadow-sm ring-1 ring-emerald-300 hover:bg-emerald-100/80 disabled:opacity-50"
          >
            {ghlGenLoading
              ? jobProgress || (includeAiImages ? "Starting CSV + images (background)…" : "Building CSV rows…")
              : "Generate for Go High Level (CSV)"}
          </button>
          <button
            type="button"
            onClick={downloadGhlCsv}
            disabled={!ghlCsv}
            className="rounded-lg border border-emerald-600 bg-transparent px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100/60 disabled:opacity-50"
          >
            Download CSV file
          </button>
          <button
            type="button"
            onClick={() => void pushGhlCsv()}
            disabled={ghlPushLoading || !ghlCsv || ghlConfigured !== true}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {ghlPushLoading ? "Uploading to HighLevel…" : "Push to Go High Level"}
          </button>
        </div>
        {ghlConfigured === false ? (
          <p className="mt-2 text-xs text-amber-900">
            Push is unavailable until an admin saves Go High Level credentials for{" "}
            {isClientContext ? "this client workspace" : "your account"}
            . You can still <strong>Download CSV</strong> and upload it manually in HighLevel.
          </p>
        ) : null}
        {isAdmin && (
          <p className="mt-2 text-xs text-emerald-900">
            Admin: configure tokens per user in{" "}
            <Link href="/admin" className="font-medium underline">
              Admin → Go High Level (Social Planner)
            </Link>
            .
          </p>
        )}
        {ghlPushMsg ? <p className="mt-2 text-sm text-emerald-900">{ghlPushMsg}</p> : null}
        {ghlImageNote ? <p className="mt-2 text-sm text-amber-900">{ghlImageNote}</p> : null}
      </section>

      {linkedInConnected && (
        <section className="mt-10 rounded-2xl border border-sky-200 bg-sky-50/80 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Post to LinkedIn (Company Page feed)</h2>
          <p className="form-hint mt-1 max-w-2xl">
            Publishes a <strong>public</strong> post to your organization&apos;s <strong>main feed</strong>. This is separate
            from <strong>ads</strong> (Home → campaign → Launch): those still create <strong>dark</strong> posts for
            sponsored content. Same LinkedIn connection for both; use the same <strong>Company Page id</strong> as in the
            campaign form.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="form-label" htmlFor="linkedin-org-urn">
                Company Page (number or urn:li:organization:…)
              </label>
              <input
                id="linkedin-org-urn"
                className="app-input mt-1 w-full"
                value={linkedinOrgUrn}
                onChange={(e) => setLinkedinOrgUrn(e.target.value)}
                placeholder="e.g. 1234567890"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="linkedin-organic-text">
                Post text (optional if you will use generated result)
              </label>
              <textarea
                id="linkedin-organic-text"
                className="app-textarea mt-1"
                rows={5}
                value={organicText}
                onChange={(e) => setOrganicText(e.target.value)}
                placeholder="Type here, or leave blank and we use the last generated result (text only, after stripping markdown a bit)."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-800">Image (optional)</label>
              <input
                type="file"
                accept="image/*"
                className="mt-1 block w-full text-sm"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) {
                    setOrganicImageDataUrl(null);
                    setOrganicImageName(null);
                    return;
                  }
                  if (isHeicFile(f)) {
                    setOrganicError("HEIC is not supported. Use JPG/PNG or convert on your phone first.");
                    return;
                  }
                  if (!isLikelyImageFile(f)) {
                    setOrganicError("Choose a JPG, PNG, WebP, or GIF.");
                    return;
                  }
                  setOrganicError(null);
                  const dataUrl = await fileToUploadableDataUrl(f);
                  setOrganicImageDataUrl(dataUrl);
                  setOrganicImageName(f.name);
                }}
              />
              {organicImageName ? (
                <p className="form-hint mt-1">Attached: {organicImageName}</p>
              ) : null}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => void generateAiImageForLinkedIn()}
                  disabled={organicAiImageLoading}
                  className="rounded-lg border border-sky-500 bg-white px-3 py-2 text-sm font-medium text-sky-900 hover:bg-sky-100 disabled:opacity-50"
                >
                  {organicAiImageLoading ? "Generating image…" : "Generate image with AI"}
                </button>
                <p className="form-hint mt-1">
                  Creates a PNG from your post text (and business profile); you can publish it with LinkedIn below.
                </p>
              </div>
            </div>
            {organicError && <p className="text-sm text-red-700">{organicError}</p>}
            {organicSuccess && <p className="text-sm text-green-800">{organicSuccess}</p>}
            <button
              type="button"
              onClick={postToLinkedInOrganic}
              disabled={organicLoading || !linkedinOrgUrn.trim()}
              className="rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
            >
              {organicLoading ? "Publishing…" : "Publish to LinkedIn now"}
            </button>
          </div>
        </section>
      )}

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      {result && (
        <div className="mt-8 space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-800">Result (Markdown)</h2>
            <pre className="mt-3 max-h-[70vh] overflow-auto whitespace-pre-wrap break-words font-sans text-sm text-zinc-800">
              {result}
            </pre>
          </div>
          {planImages.some((x) => x.imageUrl) ? (
            <div className="rounded-xl border border-indigo-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-zinc-800">AI images aligned to slots</h3>
              <p className="form-hint mt-1">
                These are the same style of assets appended to Go High Level CSV rows when images are enabled. Open in a new
                tab to download if needed.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {planImages.map((slot) =>
                  slot.imageUrl ? (
                    <div key={`${slot.index}-${slot.postAtSpecificTime}`} className="rounded-lg border border-zinc-100 p-2">
                      <p className="mb-2 text-[11px] font-medium uppercase text-zinc-500">{slot.postAtSpecificTime}</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slot.imageUrl}
                        alt=""
                        className="aspect-square w-full rounded-md object-cover"
                      />
                    </div>
                  ) : null
                )}
              </div>
            </div>
          ) : null}
          {planImageErrors.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
              <p className="font-medium">Some images failed (plan text is still available)</p>
              <ul className="mt-2 list-disc pl-5">
                {planImageErrors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
