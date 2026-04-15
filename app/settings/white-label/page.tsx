"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppNav from "@/components/AppNav";
import { ExpansionProductGate } from "@/components/ExpansionProductGate";
import { useAuth } from "@/contexts/AuthContext";
import { expansion, type AgencyBrandingRecord } from "@/lib/api";

function WhiteLabelSettingsPageInner() {
  const router = useRouter();
  const { user, loading, accountType } = useAuth();
  const [branding, setBranding] = useState<AgencyBrandingRecord | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [domainMsg, setDomainMsg] = useState<string | null>(null);

  const [brandName, setBrandName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [secondaryColor, setSecondaryColor] = useState("#64748b");
  const [accentColor, setAccentColor] = useState("#7c3aed");
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportUrl, setSupportUrl] = useState("");
  const [hidePoweredBy, setHidePoweredBy] = useState(false);
  const [welcome, setWelcome] = useState("");
  const [customDomainInput, setCustomDomainInput] = useState("");

  useEffect(() => {
    if (loading || !user) return;
    if (accountType !== "agency") {
      router.replace("/");
      return;
    }
    expansion
      .getAgencyBranding()
      .then((r) => {
        setBranding(r.branding);
        if (r.branding) {
          setBrandName(r.branding.brandName);
          setPrimaryColor(r.branding.primaryColor);
          setSecondaryColor(r.branding.secondaryColor);
          setAccentColor(r.branding.accentColor);
          setLogoUrl(r.branding.logoUrl || "");
          setFaviconUrl(r.branding.faviconUrl || "");
          setSupportEmail(r.branding.supportEmail || "");
          setSupportUrl(r.branding.supportUrl || "");
          setHidePoweredBy(r.branding.hidePoweredBy);
          setWelcome(r.branding.onboardingWelcomeMessage || "");
          setCustomDomainInput(r.branding.customDomain || "");
        } else {
          setBrandName("My agency");
        }
      })
      .catch(() => setBranding(null));
  }, [loading, user, accountType, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const r = await expansion.updateAgencyBranding({
        brandName,
        primaryColor,
        secondaryColor,
        accentColor,
        logoUrl: logoUrl || null,
        faviconUrl: faviconUrl || null,
        supportEmail: supportEmail || null,
        supportUrl: supportUrl || null,
        hidePoweredBy,
        onboardingWelcomeMessage: welcome || null,
      });
      setBranding(r.branding);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(f: File) {
    setError(null);
    try {
      const r = await expansion.uploadLogo(f);
      if (r.logoUrl) setLogoUrl(r.logoUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function uploadFavicon(f: File) {
    setError(null);
    try {
      const r = await expansion.uploadFavicon(f);
      if (r.faviconUrl) setFaviconUrl(r.faviconUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  if (loading || !user || accountType !== "agency") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Home
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-zinc-900">White label</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Branding applies to client-facing views when you use a verified custom domain. Save settings, then complete DNS
          verification below.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <form onSubmit={handleSave} className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">Brand identity</h2>
            <div>
              <label className="block text-xs font-medium text-zinc-600">Brand name</label>
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600">Primary</label>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="mt-1 h-10 w-full cursor-pointer rounded border border-zinc-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600">Secondary</label>
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="mt-1 h-10 w-full cursor-pointer rounded border border-zinc-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600">Accent</label>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="mt-1 h-10 w-full cursor-pointer rounded border border-zinc-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600">Logo URL (or upload)</label>
              <input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="https://…"
              />
              <input
                type="file"
                accept="image/*"
                className="mt-2 text-sm"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadLogo(f);
                  e.target.value = "";
                }}
              />
              {logoUrl ? (
                <img src={logoUrl} alt="" className="mt-2 max-h-24 max-w-[200px] rounded border border-zinc-200" />
              ) : null}
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600">Favicon URL (or upload)</label>
              <input
                value={faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                type="file"
                accept="image/*"
                className="mt-2 text-sm"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadFavicon(f);
                  e.target.value = "";
                }}
              />
              {faviconUrl ? (
                <img src={faviconUrl} alt="" className="mt-2 h-8 w-8 rounded border border-zinc-200" />
              ) : null}
            </div>

            <h2 className="text-lg font-semibold text-zinc-900 pt-2">Client experience</h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hidePoweredBy}
                onChange={(e) => setHidePoweredBy(e.target.checked)}
                className="rounded border-zinc-300"
              />
              Hide “Powered by” in client footer
            </label>
            <div>
              <label className="block text-xs font-medium text-zinc-600">Welcome message (first login)</label>
              <textarea
                value={welcome}
                onChange={(e) => setWelcome(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600">Support email</label>
              <input
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                type="email"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600">Support URL</label>
              <input
                value={supportUrl}
                onChange={(e) => setSupportUrl(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save branding"}
            </button>
          </form>

          <div className="space-y-6">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">Custom domain</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Add a TXT record at your DNS provider, then check verification. Point traffic (CNAME) to your app host
                separately.
              </p>
              <input
                value={customDomainInput}
                onChange={(e) => setCustomDomainInput(e.target.value)}
                placeholder="ads.youragency.com"
                className="mt-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setDomainMsg(null);
                    try {
                      const r = await expansion.initDomainVerify(customDomainInput.trim());
                      setDomainMsg(`${r.instructions}\n\nHost: ${r.txtHost}\nValue: ${r.txtValue}`);
                    } catch (err) {
                      setDomainMsg(err instanceof Error ? err.message : "Failed");
                    }
                  }}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium"
                >
                  Start verification
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setDomainMsg(null);
                    try {
                      const r = await expansion.checkDomainVerify();
                      setDomainMsg(r.message + (r.verified ? " (verified)" : ""));
                    } catch (err) {
                      setDomainMsg(err instanceof Error ? err.message : "Failed");
                    }
                  }}
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
                >
                  Check verification
                </button>
              </div>
              {branding?.customDomainVerified && (
                <p className="mt-3 text-sm font-medium text-green-700">Domain is verified</p>
              )}
              {domainMsg && (
                <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-zinc-100 p-3 text-xs text-zinc-800">{domainMsg}</pre>
              )}
            </div>

            <div
              className="rounded-xl border border-zinc-200 p-6 shadow-sm"
              style={{
                borderColor: primaryColor + "44",
                background: `linear-gradient(180deg, ${primaryColor}12, white)`,
              }}
            >
              <h2 className="text-lg font-semibold text-zinc-900">Live preview</h2>
              <div
                className="mt-4 rounded-lg border border-zinc-200 bg-white shadow"
                style={{ borderTop: `4px solid ${primaryColor}` }}
              >
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ backgroundColor: secondaryColor + "33" }}
                >
                  <span className="font-semibold" style={{ color: primaryColor }}>
                    {brandName || "Brand"}
                  </span>
                  <span className="text-xs text-zinc-600">Nav</span>
                </div>
                <div className="p-4">
                  <button
                    type="button"
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    Sample CTA
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function WhiteLabelSettingsPage() {
  return (
    <ExpansionProductGate productKey="white_label">
      <WhiteLabelSettingsPageInner />
    </ExpansionProductGate>
  );
}
