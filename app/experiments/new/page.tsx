"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function NewExperimentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("meta");
  const [budget, setBudget] = useState("30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const totalDailyBudget = Number(budget);

    try {
      const res = await fetch(`${API_URL}/experiments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          platform,
          totalDailyBudget
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `HTTP ${res.status}`);
      }

      await res.json();

      // Go back to experiments list
      router.push("/experiments");
    } catch (err: any) {
      setError(err.message || "Failed to create experiment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">New Experiment</h1>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium">Name</label>
          <input
            className="border rounded px-3 py-2 w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dental Implant Offer Test"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">Platform</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            <option value="meta">Meta (Facebook/Instagram)</option>
            <option value="google">Google Ads</option>
            <option value="tiktok">TikTok Ads</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">Total Daily Budget ($)</label>
          <input
            type="number"
            min="1"
            className="border rounded px-3 py-2 w-full"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create Experiment"}
        </button>
      </form>
    </div>
  );
}
