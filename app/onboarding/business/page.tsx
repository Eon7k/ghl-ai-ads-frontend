"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import Link from "next/link";

const PRIMARY_MODELS: { value: string; label: string }[] = [
  { value: "b2b_saas", label: "B2B / SaaS" },
  { value: "ecommerce", label: "E‑commerce / DTC" },
  { value: "local", label: "Local services" },
  { value: "agency", label: "Agency or freelancer" },
  { value: "creator", label: "Creator / personal brand" },
  { value: "marketplace", label: "Marketplace / community" },
  { value: "other", label: "Other" },
];

const REVENUE_MODELS: { value: string; label: string }[] = [
  { value: "subscription", label: "Subscription / recurring" },
  { value: "one_time", label: "One-time sales" },
  { value: "leads", label: "Leads or booked appointments" },
  { value: "ads_affiliate", label: "Ads, affiliate, or sponsorship" },
  { value: "mixed", label: "Mixed" },
];

export default function BusinessOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const edit = searchParams.get("edit") === "1";
  const {
    loading,
    user,
    accountType,
    businessOnboardingComplete,
    businessModelProfile,
    businessProfileForEmail,
    needsBusinessOnboarding,
    refreshUser,
  } = useAuth();

  const [businessName, setBusinessName] = useState("");
  const [primaryModel, setPrimaryModel] = useState("b2b_saas");
  const [revenueModel, setRevenueModel] = useState("mixed");
  const [primaryOffer, setPrimaryOffer] = useState("");
  const [idealCustomer, setIdealCustomer] = useState("");
  const [mainChannels, setMainChannels] = useState("");
  const [differentiators, setDifferentiators] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    if (businessOnboardingComplete === true && !edit) {
      router.replace("/");
    }
  }, [loading, user, businessOnboardingComplete, edit, router]);

  useEffect(() => {
    if (!businessModelProfile) return;
    const p = businessModelProfile;
    if (typeof p.businessName === "string") setBusinessName(p.businessName);
    if (typeof p.primaryModel === "string") setPrimaryModel(p.primaryModel);
    if (typeof p.revenueModel === "string") setRevenueModel(p.revenueModel);
    if (typeof p.primaryOffer === "string") setPrimaryOffer(p.primaryOffer);
    if (typeof p.idealCustomer === "string") setIdealCustomer(p.idealCustomer);
    if (typeof p.mainChannels === "string") setMainChannels(p.mainChannels);
    if (typeof p.differentiators === "string") setDifferentiators(p.differentiators);
  }, [businessModelProfile]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.auth.patchBusinessModel({
        markComplete: true,
        profile: {
          businessName: businessName.trim(),
          primaryModel,
          revenueModel,
          primaryOffer: primaryOffer.trim(),
          idealCustomer: idealCustomer.trim(),
          mainChannels: mainChannels.trim(),
          differentiators: differentiators.trim(),
          completedAt: new Date().toISOString(),
        },
      });
      await refreshUser();
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function skip() {
    setSaving(true);
    setError(null);
    try {
      await api.auth.patchBusinessModel({ skip: true });
      await refreshUser();
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not continue");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="text-zinc-600">Loading…</p>
      </div>
    );
  }

  if (!needsBusinessOnboarding && !edit) {
    return null;
  }

  const subjectEmail = businessProfileForEmail || user?.email || "";
  const isClientSubAccount = accountType === "agency" && user?.email && subjectEmail !== user.email;

  return (
    <div className="mx-auto max-w-2xl p-6 pb-16">
      <h1 className="text-2xl font-bold text-zinc-900">Tell us about this business</h1>
      {isClientSubAccount ? (
        <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50/80 px-3 py-2 text-sm text-violet-950">
          You are setting the <strong>client</strong> profile for{" "}
          <span className="font-mono text-xs">{subjectEmail}</span> (sub-account). Your agency login{" "}
          <span className="font-mono text-xs">({user?.email})</span> has a <strong>separate</strong> business profile. To
          edit the agency (not the client), go to{" "}
          <Link className="font-medium text-violet-900 underline" href="/agency">
            Agency clients
          </Link>{" "}
          and use <strong>Your agency account → Set or edit your agency’s business profile</strong> (clears &quot;view as
          client&quot; for you).
        </div>
      ) : accountType === "agency" ? (
        <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800">
          This applies to <strong>your agency login</strong>{" "}
          <span className="font-mono text-xs">({subjectEmail})</span>. For each client, use <strong>View as client</strong>{" "}
          on the agency page, then return here — each has their own saved answers.
        </div>
      ) : null}
      <p className="mt-2 text-sm text-zinc-600">
        We use this to tailor campaigns, the content strategy tool, and future features. You can{" "}
        <Link className="text-blue-700 underline" href="/">return home</Link> or{" "}
        <Link className="text-blue-700 underline" href="/content-strategy">open content strategy</Link>.
      </p>

      <div className="mt-8 space-y-4">
        <div>
          <label className="text-sm font-medium text-zinc-800">Business or brand name (optional)</label>
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Northwind Cryo"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-800">What best describes your model?</label>
          <select
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            value={primaryModel}
            onChange={(e) => setPrimaryModel(e.target.value)}
          >
            {PRIMARY_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-800">How do you mainly make money?</label>
          <select
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            value={revenueModel}
            onChange={(e) => setRevenueModel(e.target.value)}
          >
            {REVENUE_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-800">What is your main offer? (one or two sentences)</label>
          <textarea
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            rows={3}
            value={primaryOffer}
            onChange={(e) => setPrimaryOffer(e.target.value)}
            placeholder="What do you sell or deliver?"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-800">Who is your ideal customer?</label>
          <textarea
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            rows={3}
            value={idealCustomer}
            onChange={(e) => setIdealCustomer(e.target.value)}
            placeholder="Role, industry, problem they have…"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-800">Where you show up today (optional)</label>
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            value={mainChannels}
            onChange={(e) => setMainChannels(e.target.value)}
            placeholder="e.g. LinkedIn, email list, local Google, events…"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-800">What makes you different? (optional)</label>
          <textarea
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            rows={2}
            value={differentiators}
            onChange={(e) => setDifferentiators(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save and continue"}
        </button>
        <button
          type="button"
          onClick={skip}
          disabled={saving}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
