"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  api,
  type AdminOverview,
  type AdminAiPerformance,
  type MetaPermissionTestsResponse,
} from "@/lib/api";

type AdminUser = { id: string; email: string; accountType: string; createdAt: string };

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [aiPerf, setAiPerf] = useState<AdminAiPerformance | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [expandedAgencyId, setExpandedAgencyId] = useState<string | null>(null);
  const [agencyClients, setAgencyClients] = useState<Record<string, { id: string; email: string }[]>>({});
  const [addClientEmail, setAddClientEmail] = useState<Record<string, string>>({});
  const [addingClientFor, setAddingClientFor] = useState<string | null>(null);
  const [removingClient, setRemovingClient] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [metaTestLoading, setMetaTestLoading] = useState(false);
  const [metaTestResult, setMetaTestResult] = useState<MetaPermissionTestsResponse | null>(null);
  const [metaTestError, setMetaTestError] = useState<string | null>(null);
  const [metaAdAccountInput, setMetaAdAccountInput] = useState("");

  const filteredUsers = userSearch.trim()
    ? adminUsers.filter((u) => u.email.toLowerCase().includes(userSearch.trim().toLowerCase()))
    : adminUsers;

  const loadUsers = useCallback(async () => {
    try {
      const list = await api.admin.listUsers();
      setAdminUsers(list);
    } catch {
      setAdminUsers([]);
    }
  }, []);

  const loadAgencyClients = useCallback(async (agencyUserId: string) => {
    try {
      const clients = await api.admin.listAgencyClients(agencyUserId);
      setAgencyClients((prev) => ({ ...prev, [agencyUserId]: clients }));
    } catch {
      setAgencyClients((prev) => ({ ...prev, [agencyUserId]: [] }));
    }
  }, []);

  useEffect(() => {
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [ov, ai, users] = await Promise.all([
          api.admin.overview(),
          api.admin.aiPerformance(),
          api.admin.listUsers(),
        ]);
        if (!cancelled) {
          setOverview(ov);
          setAiPerf(ai);
          setAdminUsers(users);
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
          <section className="rounded-xl border border-violet-200 bg-violet-50/40 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">Meta permission tests (App Dashboard)</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Runs Graph API calls using <strong>your</strong> connected Meta token (same as Integrations). Connect Meta as this admin user first. Reconnect Meta after backend adds new OAuth scopes. Mapped to Meta &quot;Capture and manage ad leads&quot; and &quot;Measure ad performance&quot; checklist items.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor="meta-act" className="text-xs font-medium text-zinc-600">
                  Ad account (optional)
                </label>
                <input
                  id="meta-act"
                  type="text"
                  placeholder="act_505127637151996 or numeric id"
                  value={metaAdAccountInput}
                  onChange={(e) => setMetaAdAccountInput(e.target.value)}
                  className="mt-1 w-full max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <button
                type="button"
                disabled={metaTestLoading}
                onClick={async () => {
                  setMetaTestLoading(true);
                  setMetaTestError(null);
                  setMetaTestResult(null);
                  try {
                    const r = await api.admin.runMetaPermissionTests(
                      metaAdAccountInput.trim() || undefined
                    );
                    setMetaTestResult(r);
                  } catch (e) {
                    setMetaTestError(e instanceof Error ? e.message : "Request failed");
                  } finally {
                    setMetaTestLoading(false);
                  }
                }}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {metaTestLoading ? "Running tests…" : "Run all Meta permission tests"}
              </button>
            </div>
            {metaTestError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{metaTestError}</p>
            )}
            {metaTestResult && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-zinc-700">
                  <span className="font-medium">Page id:</span> {metaTestResult.summary.pageId ?? "—"} ·{" "}
                  <span className="font-medium">Ad account:</span> {metaTestResult.summary.adAccountId ?? "—"} ·{" "}
                  <span className={metaTestResult.summary.allOk ? "font-medium text-green-700" : "font-medium text-amber-800"}>
                    {metaTestResult.summary.allOk ? "All calls succeeded" : "Some calls failed — see rows"}
                  </span>
                </p>
                <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 text-left">
                        <th className="px-3 py-2 font-medium text-zinc-700">Permission / test</th>
                        <th className="px-3 py-2 font-medium text-zinc-700">Use case</th>
                        <th className="px-3 py-2 font-medium text-zinc-700">API</th>
                        <th className="px-3 py-2 font-medium text-zinc-700">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metaTestResult.results.map((row) => (
                        <tr key={row.id} className="border-b border-zinc-100">
                          <td className="px-3 py-2 text-zinc-900">{row.label}</td>
                          <td className="px-3 py-2 text-zinc-600">
                            {row.useCases.includes("captureLeads") && row.useCases.includes("measurePerformance")
                              ? "Leads + Performance"
                              : row.useCases.includes("captureLeads")
                                ? "Capture leads"
                                : "Measure performance"}
                          </td>
                          <td className="max-w-xs truncate px-3 py-2 font-mono text-xs text-zinc-500" title={row.request}>
                            {row.request}
                          </td>
                          <td className="px-3 py-2">
                            {row.ok ? (
                              <span className="text-green-700">OK</span>
                            ) : (
                              <span className="text-red-700" title={row.detail}>
                                Failed
                              </span>
                            )}
                            {row.detail && !row.ok && (
                              <p className="mt-1 max-w-md text-xs text-red-600">{row.detail}</p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* All users – search and change account type */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">All users</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Search by email and set account type to Single or Agency. Agency users can be assigned clients below.
            </p>
            <div className="mt-4">
              <input
                type="text"
                placeholder="Search by email…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <p className="mt-2 text-xs text-zinc-500">
                Showing {filteredUsers.length} of {adminUsers.length} user{adminUsers.length !== 1 ? "s" : ""}
                {userSearch.trim() ? " (filtered by search)" : ""}
              </p>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left">
                    <th className="pb-2 font-medium text-zinc-700">Email</th>
                    <th className="pb-2 font-medium text-zinc-700">Account type</th>
                    <th className="pb-2 font-medium text-zinc-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-zinc-500">
                        {adminUsers.length === 0 ? "No users yet." : "No users match your search."}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-zinc-100">
                        <td className="py-3 text-zinc-900">{u.email}</td>
                        <td className="py-3">
                          <select
                            value={u.accountType || "single"}
                            disabled={updatingUserId !== null}
                            onChange={async (e) => {
                              const v = e.target.value as "single" | "agency";
                              setUpdatingUserId(u.id);
                              try {
                                await api.admin.updateUserAccountType(u.id, v);
                                setAdminUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, accountType: v } : x)));
                              } finally {
                                setUpdatingUserId(null);
                              }
                            }}
                            className="rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-800"
                          >
                            <option value="single">Single</option>
                            <option value="agency">Agency</option>
                          </select>
                        </td>
                        <td className="py-3">
                          {(u.accountType || "single") === "agency" && (
                            <button
                              type="button"
                              onClick={() => {
                                const next = expandedAgencyId === u.id ? null : u.id;
                                setExpandedAgencyId(next);
                                if (next) loadAgencyClients(next);
                              }}
                              className="text-violet-600 hover:underline"
                            >
                              {expandedAgencyId === u.id ? "Hide clients" : "Manage clients"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {expandedAgencyId && (
              <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50/50 p-4">
                <h3 className="text-sm font-medium text-violet-900">Clients for this agency</h3>
                <ul className="mt-2 space-y-1">
                  {(agencyClients[expandedAgencyId] ?? []).map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-zinc-800">{c.email}</span>
                      <button
                        type="button"
                        disabled={removingClient !== null}
                        onClick={async () => {
                          setRemovingClient(c.id);
                          try {
                            await api.admin.removeAgencyClient(expandedAgencyId, c.id);
                            await loadAgencyClients(expandedAgencyId);
                          } finally {
                            setRemovingClient(null);
                          }
                        }}
                        className="text-red-600 hover:underline disabled:opacity-50"
                      >
                        {removingClient === c.id ? "Removing…" : "Remove"}
                      </button>
                    </li>
                  ))}
                  {(!agencyClients[expandedAgencyId] || agencyClients[expandedAgencyId].length === 0) && (
                    <li className="text-zinc-500">No clients assigned.</li>
                  )}
                </ul>
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    placeholder="Client email to add"
                    value={addClientEmail[expandedAgencyId] ?? ""}
                    onChange={(e) => setAddClientEmail((prev) => ({ ...prev, [expandedAgencyId]: e.target.value }))}
                    className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    disabled={addingClientFor !== null || !(addClientEmail[expandedAgencyId] ?? "").trim()}
                    onClick={async () => {
                      const email = (addClientEmail[expandedAgencyId] ?? "").trim();
                      if (!email) return;
                      setAddingClientFor(expandedAgencyId);
                      try {
                        await api.admin.addAgencyClient(expandedAgencyId, email);
                        setAddClientEmail((prev) => ({ ...prev, [expandedAgencyId]: "" }));
                        await loadAgencyClients(expandedAgencyId);
                      } finally {
                        setAddingClientFor(null);
                      }
                    }}
                    className="rounded bg-violet-600 px-3 py-1 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    {addingClientFor === expandedAgencyId ? "Adding…" : "Add client"}
                  </button>
                </div>
              </div>
            )}
          </section>

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
