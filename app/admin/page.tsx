"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api, type AdminOverview, type AdminAiPerformance } from "@/lib/api";

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [aiPerf, setAiPerf] = useState<AdminAiPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [ov, ai] = await Promise.all([api.admin.overview(), api.admin.aiPerformance()]);
        if (!cancelled) {
          setOverview(ov);
          setAiPerf(ai);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load admin data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin]);

  if (authLoading || !user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-800">
          <h1 className="text-xl font-semibold">Access restricted</h1>
          <p className="mt-2">This page is only available to admin users. Your account does not have admin access.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
          <h1 className="text-xl font-semibold">Error</h1>
          <p className="mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-900">Admin dashboard</h1>
      <p className="mt-1 text-sm text-zinc-500">Extra metrics and AI performance (admin only).</p>

      {loading ? (
        <p className="mt-6 text-zinc-500">Loading admin data…</p>
      ) : (
        <div className="mt-8 space-y-10">
          {/* Overview */}
          {overview && (
            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">System overview</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg bg-zinc-50 p-4">
                  <p className="text-sm text-zinc-500">Total users</p>
                  <p className="text-2xl font-bold text-zinc-900">{overview.totalUsers}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-4">
                  <p className="text-sm text-zinc-500">Total campaigns</p>
                  <p className="text-2xl font-bold text-zinc-900">{overview.totalCampaigns}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-4">
                  <p className="text-sm text-zinc-500">Launched</p>
                  <p className="text-2xl font-bold text-zinc-900">{overview.launchedCampaigns}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-4">
                  <p className="text-sm text-zinc-500">Launch rate</p>
                  <p className="text-2xl font-bold text-zinc-900">
                    {overview.totalCampaigns > 0
                      ? Math.round((overview.launchedCampaigns / overview.totalCampaigns) * 100)
                      : 0}
                    %
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-medium text-zinc-700">By platform</h3>
                <div className="mt-2 flex flex-wrap gap-3">
                  {Object.entries(overview.byPlatform).map(([platform, count]) => (
                    <span key={platform} className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-800">
                      {platform}: {count}
                    </span>
                  ))}
                  {Object.keys(overview.byPlatform).length === 0 && (
                    <span className="text-sm text-zinc-500">No campaigns yet</span>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-medium text-zinc-700">By status</h3>
                <div className="mt-2 flex flex-wrap gap-3">
                  {Object.entries(overview.byStatus).map(([status, count]) => (
                    <span key={status} className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-800">
                      {status}: {count}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Campaign funnel */}
          {overview && (
            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">Campaign funnel</h2>
              <p className="mt-1 text-sm text-zinc-500">From creation to launch.</p>
              <div className="mt-4 flex items-end gap-3">
                <div
                  className="flex-1 rounded-t bg-blue-100 p-4 text-center"
                  style={{
                    height: `${Math.max(48, Math.min(120, 48 + (overview.funnel.created || 0) * 8))}px`,
                  }}
                >
                  <p className="text-sm font-medium text-blue-900">{overview.funnel.created}</p>
                  <p className="text-xs text-blue-700">Created</p>
                </div>
                <div
                  className="flex-1 rounded-t bg-green-100 p-4 text-center"
                  style={{
                    height: `${Math.max(48, Math.min(120, 48 + (overview.funnel.launched || 0) * 8))}px`,
                  }}
                >
                  <p className="text-sm font-medium text-green-900">{overview.funnel.launched}</p>
                  <p className="text-xs text-green-700">Launched</p>
                </div>
              </div>
            </section>
          )}

          {/* AI performance */}
          {aiPerf && (
            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">AI performance</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Compare OpenAI vs Anthropic vs Split (half each) across launched Meta campaigns. Use this to see which AI drives better results as you narrow from many variants to fewer.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {(["openai", "anthropic", "split"] as const).map((key) => {
                  const p = aiPerf.byProvider[key];
                  if (!p) return null;
                  const label = key === "openai" ? "OpenAI" : key === "anthropic" ? "Anthropic" : "Split (half each)";
                  return (
                    <div key={key} className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4">
                      <h3 className="font-medium text-zinc-900">{label}</h3>
                      <dl className="mt-3 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Campaigns</span>
                          <span className="font-medium">{p.campaigns}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Spend</span>
                          <span className="font-medium">${p.spend.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Impressions</span>
                          <span className="font-medium">{p.impressions.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Clicks</span>
                          <span className="font-medium">{p.clicks}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Conversions</span>
                          <span className="font-medium">{p.conversions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Avg CTR</span>
                          <span className="font-medium">{p.avgCtr}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Avg CPC</span>
                          <span className="font-medium">${p.avgCpc.toFixed(2)}</span>
                        </div>
                      </dl>
                    </div>
                  );
                })}
              </div>
              {Object.keys(aiPerf.byProvider).length === 0 && (
                <p className="mt-4 text-sm text-zinc-500">No launched AI campaigns with Meta metrics yet. Launch some campaigns (with AI-generated copy) to see comparison here.</p>
              )}
            </section>
          )}

          {/* Quick note */}
          <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-6">
            <h2 className="text-lg font-semibold text-amber-900">Admin access</h2>
            <p className="mt-2 text-sm text-amber-800">
              This page is only visible to you because your email is listed in the backend <code className="rounded bg-amber-100 px-1">ADMIN_EMAILS</code> environment variable. Add your email there (comma-separated for multiple admins) to enable this view.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
