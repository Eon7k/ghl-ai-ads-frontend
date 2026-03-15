"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Experiment } from "@/lib/types";

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExperiments() {
      try {
        const data = await api.listExperiments();
        setExperiments(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load experiments");
      } finally {
        setLoading(false);
      }
    }

    fetchExperiments();
  }, []);

  if (loading) {
    return <div className="p-6">Loading experiments...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Experiments</h1>
        <Link
          href="/experiments/new"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold text-lg hover:bg-blue-700 border-2 border-blue-700"
        >
          + New Experiment
        </Link>
      </div>
      <p className="text-zinc-600">
        <Link href="/experiments/new" className="text-blue-600 underline hover:no-underline">
          Create a new experiment
        </Link>{" "}
        to generate ad variants from a prompt, edit them, and launch.
      </p>

      {experiments.length === 0 ? (
        <p className="text-zinc-500">No experiments yet. Click “New Experiment” to get started.</p>
      ) : (
        <div className="space-y-2">
          {experiments.map((exp) => (
            <Link
              key={exp.id}
              href={`/experiments/${exp.id}`}
              className="block border rounded-lg p-4 flex flex-col gap-1 bg-white shadow-sm hover:bg-zinc-50"
            >
              <div className="flex justify-between items-start">
                <span className="font-semibold">{exp.name}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    exp.status === "draft" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
                  }`}
                >
                  {exp.status === "draft" ? "Draft" : "Launched"}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600">
                <span>{exp.platform.toUpperCase()}</span>
                <span>${exp.totalDailyBudget}/day</span>
                {exp.variantCount != null && exp.variantCount > 0 && (
                  <span>
                    {exp.variantCount} variant{exp.variantCount === 1 ? "" : "s"} · ~$
                    {Math.round((exp.totalDailyBudget / exp.variantCount) * 100) / 100}/variant
                  </span>
                )}
                <span>Phase: {exp.phase}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
