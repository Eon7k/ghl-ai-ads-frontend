"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Experiment } from "@/lib/types";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const data = await api.listExperiments();
        setCampaigns(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load campaigns");
      } finally {
        setLoading(false);
      }
    }

    fetchCampaigns();
  }, []);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Campaigns</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Create campaigns, generate or paste ad copy, then launch to your connected ad accounts.
          </p>
        </div>
        <Link
          href="/campaigns/new"
          className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          + New Campaign
        </Link>
      </div>

      {loading && (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
          Loading campaigns…
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {!loading && !error && campaigns.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <p className="text-zinc-600">No campaigns yet.</p>
          <Link
            href="/campaigns/new"
            className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Create your first campaign
          </Link>
        </div>
      )}

      {!loading && !error && campaigns.length > 0 && (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/campaigns/${c.id}`}
              className="block rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:shadow"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-semibold text-zinc-900">{c.name}</span>
                  <span
                    className={`ml-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${
                      c.status === "draft" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
                    }`}
                  >
                    {c.status === "draft" ? "Draft" : "Launched"}
                  </span>
                </div>
                <span className="text-sm text-zinc-500">{c.platform}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600">
                <span>${c.totalDailyBudget}/day</span>
                {c.variantCount != null && c.variantCount > 0 && (
                  <span>
                    {c.variantCount} variant{c.variantCount === 1 ? "" : "s"}
                  </span>
                )}
                <span>{c.phase}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
