"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Experiment = {
  id: string;
  name: string;
  platform: string;
  status: string;
  phase: string;
  totalDailyBudget: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExperiments() {
      try {
        const res = await fetch(`${API_URL}/experiments`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setExperiments(data);
      } catch (err: any) {
        setError(err.message || "Failed to load experiments");
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
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700"
        >
          New Experiment
        </Link>
      </div>
      {experiments.length === 0 ? (
        <p>No experiments yet.</p>
      ) : (
        <div className="space-y-2">
          {experiments.map((exp) => (
            <div
              key={exp.id}
              className="border rounded p-4 flex flex-col gap-1 bg-white shadow-sm"
            >
              <div className="flex justify-between">
                <span className="font-semibold">{exp.name}</span>
                <span className="text-sm text-gray-500">
                  {exp.platform.toUpperCase()}
                </span>
              </div>
              <div className="text-sm text-gray-700">
                Status: <strong>{exp.status}</strong> — Phase:{" "}
                <strong>{exp.phase}</strong>
              </div>
              <div className="text-sm text-gray-700">
                Daily budget: ${exp.totalDailyBudget}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
