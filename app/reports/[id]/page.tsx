"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AppNav from "@/components/AppNav";
import { ExpansionProductGate } from "@/components/ExpansionProductGate";
import { useAuth } from "@/contexts/AuthContext";
import { expansion, type GeneratedReportRow, type ReportConfigRow } from "@/lib/api";

function formatEmails(recipients: unknown): string {
  if (!Array.isArray(recipients)) return "";
  return recipients.filter((x): x is string => typeof x === "string").join(", ");
}

function ReportsDetailInner() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { user, loading } = useAuth();

  const [config, setConfig] = useState<ReportConfigRow | null>(null);
  const [generated, setGenerated] = useState<GeneratedReportRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  const [reportName, setReportName] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [emails, setEmails] = useState("");
  const [reportFormat, setReportFormat] = useState("pdf");
  const [isActive, setIsActive] = useState(true);

  const load = useCallback(async () => {
    if (!id || !user) return;
    setLoadError(null);
    try {
      const [{ config: c }, { generated: g }] = await Promise.all([
        expansion.reports.getConfig(id),
        expansion.reports.listGenerated(id),
      ]);
      setConfig(c);
      setGenerated(g);
      setReportName(c.reportName);
      setFrequency(c.frequency);
      setEmails(formatEmails(c.emailRecipients));
      setReportFormat(c.reportFormat);
      setIsActive(c.isActive);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load");
      setConfig(null);
    }
  }, [id, user]);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    if (user && id) void load();
  }, [user, id, load]);

  async function save() {
    if (!id) return;
    setActionError(null);
    setSaving(true);
    try {
      const emailRecipients = emails
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const { config: c } = await expansion.reports.updateConfig(id, {
        reportName: reportName.trim(),
        frequency,
        reportFormat,
        emailRecipients,
        isActive,
      });
      setConfig(c);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!id || !confirm("Delete this report config and its history?")) return;
    setActionError(null);
    try {
      await expansion.reports.deleteConfig(id);
      router.push("/reports");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function recordRun() {
    if (!id) return;
    setRecording(true);
    setActionError(null);
    try {
      await expansion.reports.recordRun(id);
      const { generated: g } = await expansion.reports.listGenerated(id);
      setGenerated(g);
      const { config: c } = await expansion.reports.getConfig(id);
      setConfig(c);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not record run");
    } finally {
      setRecording(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-violet-600" />
      </div>
    );
  }

  if (loadError || !config) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <AppNav />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-red-600">{loadError || "Not found"}</p>
          <Link href="/reports" className="mt-4 inline-block text-violet-700 hover:underline">
            ← Reports
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/reports" className="text-sm text-violet-700 hover:underline">
          ← All report configs
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-zinc-900">Edit report config</h1>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => void recordRun()}
              disabled={recording}
              className="rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-medium text-violet-800 hover:bg-violet-50 disabled:opacity-50"
            >
              {recording ? "Recording…" : "Record delivery run"}
            </button>
            <button
              type="button"
              onClick={remove}
              className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
        {actionError && <p className="mt-2 text-sm text-red-600">{actionError}</p>}

        <div className="mt-8 space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Report name</label>
            <input
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
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
            <label className="block text-sm font-medium text-zinc-700">Email recipients</label>
            <input
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-800">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
            Active
          </label>
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-900">Delivery history</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Runs you record here update last sent time. Attach real PDF/HTML URLs when your report pipeline is connected.
          </p>
          {generated.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600">No runs yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {generated.map((g) => (
                <li
                  key={g.id}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm"
                >
                  <p className="font-medium text-zinc-900">
                    {new Date(g.reportPeriodStart).toLocaleDateString()} –{" "}
                    {new Date(g.reportPeriodEnd).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {g.status}
                    {g.fileUrlPdf ? (
                      <>
                        {" · "}
                        <a href={g.fileUrlPdf} className="text-violet-700 hover:underline" target="_blank" rel="noreferrer">
                          PDF
                        </a>
                      </>
                    ) : null}
                    {g.fileUrlHtml ? (
                      <>
                        {" · "}
                        <a href={g.fileUrlHtml} className="text-violet-700 hover:underline" target="_blank" rel="noreferrer">
                          HTML
                        </a>
                      </>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

export default function ReportsDetailPage() {
  return (
    <ExpansionProductGate productKey="reports">
      <ReportsDetailInner />
    </ExpansionProductGate>
  );
}
