"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppNav from "@/components/AppNav";
import { ExpansionProductGate } from "@/components/ExpansionProductGate";
import { useAuth } from "@/contexts/AuthContext";
import { expansion, type ReportConfigRow } from "@/lib/api";

function ReportsPageInner() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [configs, setConfigs] = useState<ReportConfigRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const [reportName, setReportName] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [emails, setEmails] = useState("");
  const [reportFormat, setReportFormat] = useState("pdf");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setListLoading(true);
    setError(null);
    try {
      const { configs: rows } = await expansion.reports.listConfigs();
      setConfigs(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load reports");
      setConfigs([]);
    } finally {
      setListLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) void load();
  }, [user, load, refetchKey]);

  useEffect(() => {
    const refresh = () => setRefetchKey((k) => k + 1);
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  async function createConfig(e: React.FormEvent) {
    e.preventDefault();
    const name = reportName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const emailRecipients = emails
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const { config } = await expansion.reports.createConfig({
        reportName: name,
        frequency,
        reportFormat,
        emailRecipients,
        includeSections: { performance: true, spend: true, creatives: true },
      });
      setReportName("");
      setEmails("");
      router.push(`/reports/${config.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/" className="text-sm text-violet-700 hover:underline">
          ← Home
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-zinc-900">Client reports</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Schedule-style report configs per client context. PDF/HTML generation can be wired to a worker later; you can
          record delivery runs now to build history.
        </p>

        <form
          onSubmit={createConfig}
          className="mt-8 space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-zinc-900">New report config</h2>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Report name</label>
            <input
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder="March performance — Acme"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
                <option value="on_demand">On demand</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Format</label>
              <select
                value={reportFormat}
                onChange={(e) => setReportFormat(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="pdf">PDF</option>
                <option value="html">HTML</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Email recipients (comma-separated)</label>
            <input
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="client@example.com, pm@agency.com"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create & open"}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-900">Your report configs</h2>
          {listLoading && <p className="mt-3 text-sm text-zinc-500">Loading…</p>}
          {!listLoading && configs.length === 0 && (
            <p className="mt-3 text-sm text-zinc-600">No configs yet. Create one above.</p>
          )}
          <ul className="mt-4 space-y-2">
            {configs.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/reports/${c.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900">{c.reportName}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {c.frequency} · {c.reportFormat}
                      {c._count != null ? ` · ${c._count.generatedReports} runs` : ""}
                      {c.isActive ? "" : " · paused"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-violet-700">Open →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ExpansionProductGate productKey="reports">
      <ReportsPageInner />
    </ExpansionProductGate>
  );
}
