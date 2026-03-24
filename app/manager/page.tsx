"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import AppNav from "@/components/AppNav";
import { IntegrationLogo } from "@/components/IntegrationLogo";
import type { Experiment } from "@/lib/types";

const PLATFORM_NAMES: Record<string, string> = {
  meta: "Meta",
  google: "Google Ads",
  tiktok: "TikTok",
};

/** Group experiments by campaignGroupId; each group is one "campaign" in the manager. */
function groupCampaigns(experiments: Experiment[]): { groupId: string; name: string; status: string; platforms: string[]; experiments: Experiment[] }[] {
  const byGroup = new Map<string, Experiment[]>();
  for (const e of experiments) {
    const gid = e.campaignGroupId ?? e.id;
    if (!byGroup.has(gid)) byGroup.set(gid, []);
    byGroup.get(gid)!.push(e);
  }
  return Array.from(byGroup.entries()).map(([groupId, exps]) => {
    const sorted = exps.slice().sort((a, b) => a.platform.localeCompare(b.platform));
    const name = sorted[0]?.name ?? "Campaign";
    const status = exps.some((e) => e.status === "launched") ? "Active" : "Draft";
    const platforms = sorted.map((e) => e.platform);
    return { groupId, name, status, platforms, experiments: sorted };
  });
}

export default function ManagerPage() {
  const { user, loading } = useAuth();
  const [campaigns, setCampaigns] = useState<Experiment[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoadingList(true);
    api.listExperiments().then(setCampaigns).catch(() => setCampaigns([])).finally(() => setLoadingList(false));
  }, [user]);

  const groups = groupCampaigns(campaigns);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans">
        <AppNav />
        <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-zinc-600">Sign in to view Campaign Manager.</p>
          <Link href="/login" className="mt-4 inline-block text-blue-600 hover:underline">Log in</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <AppNav />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-900">Campaign Manager</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            View your active and past campaigns. Create new campaigns from <Link href="/" className="text-blue-600 hover:underline">Home</Link>.
          </p>
        </section>

        <section id="campaigns">
          <h2 className="text-lg font-semibold text-zinc-900">Your campaigns</h2>
          {loadingList ? (
            <div className="mt-4 flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
            </div>
          ) : groups.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">No campaigns yet. Use “New campaign” on the Home page to create one.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {groups.map((g) => (
                <li key={g.groupId}>
                  <Link
                    href={`/manager/${g.groupId}`}
                    className="block rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-zinc-900">{g.name}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
                          {g.platforms.map((p) => (
                            <span key={p} className="flex items-center gap-1">
                              <IntegrationLogo platform={p as "meta" | "google" | "tiktok"} size={16} className="rounded" />
                              {PLATFORM_NAMES[p] ?? p}
                            </span>
                          ))}
                          {g.experiments[0] && (
                            <>
                              <span>·</span>
                              <span>${g.experiments[0].totalDailyBudget}/day</span>
                              {g.experiments[0].variantCount != null && (
                                <span>· {g.experiments[0].variantCount} variant{g.experiments[0].variantCount === 1 ? "" : "s"}</span>
                              )}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                        {(() => {
                          const m = g.experiments[0]?.aiOptimizationMode ?? "off";
                          const aiLabel =
                            m === "auto" ? "AI: Auto" : m === "suggestions" ? "AI: Suggestions" : "AI: Off";
                          const aiClass =
                            m === "auto"
                              ? "bg-violet-100 text-violet-900"
                              : m === "suggestions"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-zinc-100 text-zinc-600";
                          return (
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${aiClass}`}>
                              {aiLabel}
                            </span>
                          );
                        })()}
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${g.status === "Active" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                          {g.status === "Active" ? "Launched" : "Draft"}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
