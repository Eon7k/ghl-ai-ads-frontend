"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import AppNav from "@/components/AppNav";
import { IntegrationLogo } from "@/components/IntegrationLogo";
import type { Experiment } from "@/lib/types";
import type { CampaignMetricsResponse } from "@/lib/api";

const PLATFORM_NAMES: Record<string, string> = {
  meta: "Meta (Facebook & Instagram)",
  google: "Google Ads",
  tiktok: "TikTok Ads",
};

export default function ManagerCampaignPage() {
  const params = useParams();
  const groupId = typeof params.groupId === "string" ? params.groupId : "";
  const { user, loading } = useAuth();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [metricsByExpId, setMetricsByExpId] = useState<Record<string, CampaignMetricsResponse>>({});

  useEffect(() => {
    if (!user || !groupId) return;
    setLoadingList(true);
    api
      .listExperiments()
      .then((list) => {
        const inGroup = list.filter((e) => (e.campaignGroupId ?? e.id) === groupId);
        setExperiments(inGroup.sort((a, b) => a.platform.localeCompare(b.platform)));
      })
      .catch(() => setExperiments([]))
      .finally(() => setLoadingList(false));
  }, [user, groupId]);

  useEffect(() => {
    if (experiments.length === 0) return;
    const launched = experiments.filter((e) => e.status === "launched");
    launched.forEach((exp) => {
      api
        .getCampaignMetrics(exp.id)
        .then((m) => setMetricsByExpId((prev) => ({ ...prev, [exp.id]: m })))
        .catch(() => {});
    });
  }, [experiments]);

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
          <p className="text-zinc-600">Sign in to view this campaign.</p>
          <Link href="/login" className="mt-4 inline-block text-blue-600 hover:underline">Log in</Link>
        </main>
      </div>
    );
  }

  const campaignName = experiments[0]?.name ?? "Campaign";

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <AppNav />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/manager" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
            ← Campaign Manager
          </Link>
        </div>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-900">{campaignName}</h2>
          <p className="mt-0.5 text-sm text-zinc-500">Performance by platform</p>
        </section>

        {loadingList ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
          </div>
        ) : experiments.length === 0 ? (
          <p className="text-sm text-zinc-500">Campaign not found.</p>
        ) : (
          <section>
            <ul className="space-y-3">
              {experiments.map((exp) => {
                const metrics = metricsByExpId[exp.id];
                return (
                  <li key={exp.id}>
                    <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <IntegrationLogo platform={exp.platform as "meta" | "google" | "tiktok"} size={40} className="shrink-0 rounded-lg" />
                          <div>
                            <p className="font-semibold text-zinc-900">{PLATFORM_NAMES[exp.platform] ?? exp.platform}</p>
                            <p className="text-sm text-zinc-500">
                              ${exp.totalDailyBudget}/day
                              {exp.variantCount != null && ` · ${exp.variantCount} variant${exp.variantCount === 1 ? "" : "s"}`}
                            </p>
                          </div>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${exp.status === "launched" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                          {exp.status === "launched" ? "Launched" : "Draft"}
                        </span>
                      </div>

                      {exp.status === "launched" && metrics && (
                        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-4">
                          <div>
                            <p className="text-xs text-zinc-500">Spend</p>
                            <p className="font-medium text-zinc-900">${metrics.spend.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">Impressions</p>
                            <p className="font-medium text-zinc-900">{metrics.impressions.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">Clicks</p>
                            <p className="font-medium text-zinc-900">{metrics.clicks.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">CTR</p>
                            <p className="font-medium text-zinc-900">{(metrics.ctr * 100).toFixed(2)}%</p>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 border-t border-zinc-100 pt-3">
                        <Link
                          href={`/campaigns/${exp.id}`}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          View full details →
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
