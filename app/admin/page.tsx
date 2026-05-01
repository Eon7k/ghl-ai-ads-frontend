"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  api,
  type AdminOverview,
  type AdminAiPerformance,
  type MetaPermissionTestsResponse,
} from "@/lib/api";
import { EXPANSION_PRODUCTS } from "@/lib/products";
import AppNav from "@/components/AppNav";
import { PageGuide } from "@/components/PageGuide";

type AdminUser = {
  id: string;
  email: string;
  accountType: string;
  createdAt: string;
  enabledProductKeys: string[] | null;
};

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
  const [metaPageIdInput, setMetaPageIdInput] = useState("");
  const [ghlAdminUserId, setGhlAdminUserId] = useState("");
  const [ghlAdminLocationId, setGhlAdminLocationId] = useState("");
  const [ghlAdminPit, setGhlAdminPit] = useState("");
  const [ghlAdminLabel, setGhlAdminLabel] = useState("");
  const [ghlAdminTokenLast4, setGhlAdminTokenLast4] = useState<string | null>(null);
  const [ghlAdminLoadingCred, setGhlAdminLoadingCred] = useState(false);
  const [ghlAdminSaving, setGhlAdminSaving] = useState(false);
  const [ghlAdminDeleting, setGhlAdminDeleting] = useState(false);
  const [ghlAdminErr, setGhlAdminErr] = useState<string | null>(null);
  const [ghlAdminOk, setGhlAdminOk] = useState<string | null>(null);
  const [productEditorUser, setProductEditorUser] = useState<AdminUser | null>(null);
  const [productEditorMode, setProductEditorMode] = useState<"all" | "custom">("custom");
  const [productEditorKeys, setProductEditorKeys] = useState<Set<string>>(new Set());
  const [productEditorSaving, setProductEditorSaving] = useState(false);
  const [productEditorError, setProductEditorError] = useState<string | null>(null);

  function openProductEditor(u: AdminUser) {
    setProductEditorError(null);
    setProductEditorUser(u);
    if (u.enabledProductKeys === null) {
      setProductEditorMode("all");
      setProductEditorKeys(new Set(EXPANSION_PRODUCTS.map((p) => p.key)));
    } else {
      setProductEditorMode("custom");
      setProductEditorKeys(new Set(u.enabledProductKeys));
    }
  }

  function toggleProductEditorKey(key: string) {
    setProductEditorKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  useEffect(() => {
    if (!ghlAdminUserId.trim()) {
      setGhlAdminLocationId("");
      setGhlAdminLabel("");
      setGhlAdminPit("");
      setGhlAdminTokenLast4(null);
      setGhlAdminErr(null);
      return;
    }
    let cancelled = false;
    setGhlAdminLoadingCred(true);
    setGhlAdminErr(null);
    setGhlAdminOk(null);
    api.admin
      .getUserGhlSocialPlanner(ghlAdminUserId.trim())
      .then((r) => {
        if (cancelled) return;
        if (r.configured) {
          setGhlAdminLocationId(r.locationId);
          setGhlAdminLabel(r.label ?? "");
          setGhlAdminTokenLast4(r.tokenLast4);
        } else {
          setGhlAdminLocationId("");
          setGhlAdminLabel("");
          setGhlAdminTokenLast4(null);
        }
        setGhlAdminPit("");
      })
      .catch((e) => {
        if (!cancelled) setGhlAdminErr(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setGhlAdminLoadingCred(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ghlAdminUserId]);

  const filteredUsers = userSearch.trim()
    ? adminUsers.filter((u) => u.email.toLowerCase().includes(userSearch.trim().toLowerCase()))
    : adminUsers;

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
    <div className="min-h-screen bg-zinc-50 font-sans">
      <AppNav />
      <div id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-4 py-8 outline-none">
        <PageGuide
          className="mb-6"
          title="Admin (operators only)"
          steps={[
            "This page is for internal or trusted operators — not for end clients. Use it to view users, agency trees, optional product flags (kits, white label, and similar), and Go High Level Social Planner credentials per portal user.",
            "The Help page in the top bar is written for your customers; send them there for day-to-day campaign steps.",
            "If you are only testing ads as yourself, you rarely need this screen — use Home and campaigns instead.",
          ]}
        />
      <h1 className="text-2xl font-bold text-zinc-900">Admin dashboard</h1>
      <p className="mt-1 text-sm text-zinc-500">Extra metrics and AI performance (admin only).</p>

      {loading ? (
        <p className="mt-6 text-zinc-500">Loading admin data…</p>
      ) : (
        <div className="mt-8 space-y-10">
          <section className="rounded-xl border border-violet-200 bg-violet-50/40 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">Meta permission tests (App Dashboard)</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Runs Graph API calls as your app (<strong>Ai Ad</strong>) using the Meta token stored for this admin account (same token as <strong>Integrations → Meta</strong>). This helps Meta&apos;s Testing tab register API calls. Green &quot;Completed&quot; bubbles are decided by Meta (use case finished + right calls), not only by how many times you click.
            </p>

            <details className="mt-4 rounded-lg border border-violet-200 bg-white px-4 py-3 text-sm text-zinc-800">
              <summary className="cursor-pointer font-medium text-violet-900">Step-by-step: what you must do outside this app</summary>
              <ol className="mt-3 list-decimal space-y-3 pl-5 text-zinc-700">
                <li>
                  <strong>Meta Developers</strong> → your app <strong>Ai Ad</strong> → <strong>Testing</strong>. Keep this tab open so you can refresh after each run.
                </li>
                <li>
                  <strong>Use the same Facebook user</strong> that owns or manages the Page and ad account, and that you will connect in your product.
                </li>
                <li>
                  <strong>Page access (critical for pages_manage_ads and leads):</strong> Meta Business Suite (or Business Settings) → <strong>Accounts → Pages</strong> → open
                  your Page → <strong>People</strong> / <strong>Partners</strong> → ensure this Facebook profile has <strong>Advertise</strong> on the Page (or{" "}
                  <strong>Full control</strong> / Admin). Without <strong>ADVERTISE</strong> in Page tasks, <code className="rounded bg-zinc-100 px-1 text-xs">ads_posts</code> and{" "}
                  <code className="rounded bg-zinc-100 px-1 text-xs">leadgen_forms</code> often fail.
                </li>
                <li>
                  <strong>Reconnect Meta</strong> in your app: <strong>Integrations</strong> → disconnect if needed → <strong>Connect Meta</strong> again, and approve{" "}
                  <em>all</em> permissions (email, pages, leads, ads). Required at least once after we add scopes like{" "}
                  <code className="rounded bg-zinc-100 px-1 text-xs">pages_read_engagement</code> or{" "}
                  <code className="rounded bg-zinc-100 px-1 text-xs">leads_retrieval</code>. If{" "}
                  <strong>pages_read_engagement</strong> fails with Meta error <strong>#10</strong>, your stored token is missing that scope — reconnecting fixes it (no code change on your side).
                </li>
                <li>
                  <strong>Optional fields</strong> below: <strong>Page id</strong> if the wrong Page is auto-selected (we pick the Page with <strong>ADVERTISE</strong> task first). <strong>Ad account</strong> as <code className="rounded bg-zinc-100 px-1 text-xs">act_…</code> if auto-detect is wrong.
                </li>
                <li>
                  Click <strong>Run all Meta permission tests</strong>. Wait until every row shows <strong>OK</strong> (or read the red error — fix roles, then reconnect, then run again).
                </li>
                <li>
                  <strong>leads_retrieval:</strong> If the Page has <strong>no Instant Forms</strong>, create one (Page tools / Ads) so we can call{" "}
                  <code className="rounded bg-zinc-100 px-1 text-xs">/leadgen_forms</code> and optionally <code className="rounded bg-zinc-100 px-1 text-xs">/…/leads</code>.
                </li>
                <li>
                  <strong>Testing tab grey bubbles:</strong> If a line still shows grey with many calls, open that permission in Meta → <strong>View details</strong> and do any <strong>required</strong> call they list. Then complete the <strong>use case</strong> (e.g. &quot;Capture &amp; manage ad leads&quot;) when Meta offers <strong>Complete testing</strong>.
                </li>
                <li>
                  <strong>Live ads (production):</strong> You must still <strong>Publish</strong> the app and pass <strong>App Review</strong> for Advanced Access — testing alone does not replace that.
                </li>
              </ol>
            </details>
            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="min-w-0 flex-1">
                <label htmlFor="meta-page" className="text-xs font-medium text-zinc-600">
                  Page id (optional)
                </label>
                <input
                  id="meta-page"
                  type="text"
                  placeholder="Numeric Page id from Meta (same as in Page settings URL)"
                  value={metaPageIdInput}
                  onChange={(e) => setMetaPageIdInput(e.target.value)}
                  className="mt-1 w-full max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <div className="min-w-0 flex-1">
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
                    const r = await api.admin.runMetaPermissionTests({
                      metaAdAccountId: metaAdAccountInput.trim() || undefined,
                      metaPageId: metaPageIdInput.trim() || undefined,
                    });
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
                  {metaTestResult.summary.graphApiVersion != null && (
                    <>
                      <span className="font-medium">Graph API:</span> {metaTestResult.summary.graphApiVersion}
                      {" · "}
                    </>
                  )}
                  <span className="font-medium">Page id:</span> {metaTestResult.summary.pageId ?? "—"}
                  {metaTestResult.summary.requestedPageId ? (
                    <span className="text-zinc-500"> (requested: {metaTestResult.summary.requestedPageId})</span>
                  ) : null}
                  {" · "}
                  <span className="font-medium">Ad account:</span> {metaTestResult.summary.adAccountId ?? "—"} ·{" "}
                  <span className={metaTestResult.summary.allOk ? "font-medium text-green-700" : "font-medium text-amber-800"}>
                    {metaTestResult.summary.allOk ? "All calls succeeded" : "Some calls failed — see rows"}
                  </span>
                </p>
                {metaTestResult.summary.pageTasks != null && metaTestResult.summary.pageTasks.length > 0 && (
                  <p className="text-sm text-zinc-700">
                    <span className="font-medium">Page tasks (Graph):</span>{" "}
                    {metaTestResult.summary.pageTasks.join(", ")}
                    {!metaTestResult.summary.pageTasks.some((t) => t.toUpperCase().includes("ADVERTISE")) && (
                      <span className="ml-1 text-amber-800">
                        — Missing ADVERTISE; add it in Business/Page settings, then reconnect Meta.
                      </span>
                    )}
                  </p>
                )}
                {metaTestResult.summary.suggestions != null && metaTestResult.summary.suggestions.length > 0 && (
                  <ul className="list-disc space-y-1 rounded-lg border border-amber-200 bg-amber-50/80 py-2 pl-8 pr-3 text-sm text-amber-950">
                    {metaTestResult.summary.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                )}
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

          <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-emerald-950">Go High Level — Social Planner (per portal user)</h2>
            <p className="mt-1 text-sm text-emerald-900/90">
              Store each workspace&apos;s HighLevel <strong>Sub-account Location id</strong> and{" "}
              <strong>Private Integration Token</strong> (Social Planner scopes). Content strategy uses these for{" "}
              <strong>Push to Go High Level</strong>; clients never enter secrets themselves.
            </p>
            <p className="mt-2 text-xs text-emerald-800/90">
              Pick the portal account row (usually the <strong>client</strong> user for agency setups — match Agency → Manage clients).
              Docs:{" "}
              <a
                href="https://help.gohighlevel.com/support/solutions/articles/155000005411-prerequisite-for-bulk-csv-basic-and-advance-csv"
                className="underline"
                target="_blank"
                rel="noreferrer"
              >
                Bulk CSV prerequisites
              </a>
              .
            </p>

            <div className="mt-4 max-w-xl">
              <label htmlFor="ghl-user" className="text-xs font-medium text-emerald-950">
                Portal user
              </label>
              <select
                id="ghl-user"
                value={ghlAdminUserId}
                onChange={(e) => setGhlAdminUserId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm text-zinc-900"
              >
                <option value="">Select user…</option>
                {adminUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email} ({u.accountType || "single"})
                  </option>
                ))}
              </select>
              {ghlAdminLoadingCred && ghlAdminUserId ? (
                <p className="mt-1 text-xs text-emerald-800">Loading saved credential…</p>
              ) : null}
            </div>

            {ghlAdminUserId ? (
              <div className="mt-4 grid max-w-xl gap-3">
                <div>
                  <label className="text-xs font-medium text-emerald-950">Location id</label>
                  <input
                    type="text"
                    value={ghlAdminLocationId}
                    onChange={(e) => setGhlAdminLocationId(e.target.value)}
                    placeholder="HighLevel location / sub-account id"
                    autoComplete="off"
                    className="mt-1 w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-emerald-950">
                    Private Integration Token{" "}
                    {ghlAdminTokenLast4 ? (
                      <span className="font-normal text-zinc-600">(saved …{ghlAdminTokenLast4})</span>
                    ) : null}
                  </label>
                  <input
                    type="password"
                    value={ghlAdminPit}
                    onChange={(e) => setGhlAdminPit(e.target.value)}
                    placeholder="Leave blank to keep existing token when updating location only"
                    autoComplete="new-password"
                    className="mt-1 w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-emerald-950">Label (optional)</label>
                  <input
                    type="text"
                    value={ghlAdminLabel}
                    onChange={(e) => setGhlAdminLabel(e.target.value)}
                    placeholder="e.g. Client brand name"
                    autoComplete="off"
                    className="mt-1 w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                {ghlAdminErr ? (
                  <p className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-sm text-red-800">{ghlAdminErr}</p>
                ) : null}
                {ghlAdminOk ? (
                  <p className="rounded border border-emerald-200 bg-emerald-100/80 px-2 py-1.5 text-sm text-emerald-900">
                    {ghlAdminOk}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={ghlAdminSaving || !ghlAdminLocationId.trim()}
                    onClick={async () => {
                      setGhlAdminSaving(true);
                      setGhlAdminErr(null);
                      setGhlAdminOk(null);
                      try {
                        await api.admin.saveUserGhlSocialPlanner(ghlAdminUserId.trim(), {
                          locationId: ghlAdminLocationId.trim(),
                          ...(ghlAdminPit.trim() ? { privateIntegrationToken: ghlAdminPit.trim() } : {}),
                          label: ghlAdminLabel.trim() || null,
                        });
                        setGhlAdminOk("Saved.");
                        setGhlAdminPit("");
                        const r = await api.admin.getUserGhlSocialPlanner(ghlAdminUserId.trim());
                        if (r.configured) setGhlAdminTokenLast4(r.tokenLast4);
                      } catch (e) {
                        setGhlAdminErr(e instanceof Error ? e.message : "Save failed");
                      } finally {
                        setGhlAdminSaving(false);
                      }
                    }}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {ghlAdminSaving ? "Saving…" : "Save credentials"}
                  </button>
                  <button
                    type="button"
                    disabled={ghlAdminDeleting || !ghlAdminUserId.trim()}
                    onClick={async () => {
                      if (
                        typeof window !== "undefined" &&
                        !window.confirm("Remove Go High Level credentials for this user? Push will stop working until you save again.")
                      ) {
                        return;
                      }
                      setGhlAdminDeleting(true);
                      setGhlAdminErr(null);
                      setGhlAdminOk(null);
                      try {
                        await api.admin.deleteUserGhlSocialPlanner(ghlAdminUserId.trim());
                        setGhlAdminOk("Removed.");
                        setGhlAdminLocationId("");
                        setGhlAdminLabel("");
                        setGhlAdminPit("");
                        setGhlAdminTokenLast4(null);
                      } catch (e) {
                        setGhlAdminErr(e instanceof Error ? e.message : "Remove failed");
                      } finally {
                        setGhlAdminDeleting(false);
                      }
                    }}
                    className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
                  >
                    {ghlAdminDeleting ? "Removing…" : "Remove credentials"}
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          {/* All users – search and change account type */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">All users</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Search by email and set account type to Single or Agency. Use <strong>Expansion products</strong> to choose
              which optional modules (white label, landing pages, kits, etc.) each account can access.{" "}
              <strong>All modules</strong> means the same as legacy accounts (no restriction). New signups default to no
              modules until you enable them here.
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
                    <th className="pb-2 font-medium text-zinc-700">Expansion products</th>
                    <th className="pb-2 font-medium text-zinc-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-zinc-500">
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
                        <td className="max-w-[200px] py-3 text-xs text-zinc-600">
                          {u.enabledProductKeys === null ? (
                            <span className="font-medium text-green-800">All modules</span>
                          ) : u.enabledProductKeys.length === 0 ? (
                            <span className="text-zinc-500">None</span>
                          ) : (
                            <span>{u.enabledProductKeys.length} selected</span>
                          )}
                          <button
                            type="button"
                            onClick={() => openProductEditor(u)}
                            className="ml-2 text-violet-600 hover:underline"
                          >
                            Edit
                          </button>
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

          {productEditorUser && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="product-editor-title"
            >
              <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
                <h2 id="product-editor-title" className="text-lg font-semibold text-zinc-900">
                  Expansion products for {productEditorUser.email}
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Control which optional modules appear in the nav and API for this account. Your admin email bypasses
                  these checks for testing.
                </p>

                <fieldset className="mt-4 space-y-2">
                  <legend className="sr-only">Access mode</legend>
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name="product-mode"
                      checked={productEditorMode === "all"}
                      onChange={() => setProductEditorMode("all")}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-medium text-zinc-900">All modules</span>
                      <span className="block text-zinc-600">Same as legacy: every expansion feature is allowed.</span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name="product-mode"
                      checked={productEditorMode === "custom"}
                      onChange={() => {
                        setProductEditorMode("custom");
                        if (productEditorKeys.size === 0) {
                          setProductEditorKeys(new Set(EXPANSION_PRODUCTS.map((p) => p.key)));
                        }
                      }}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-medium text-zinc-900">Custom</span>
                      <span className="block text-zinc-600">Choose individual products below.</span>
                    </span>
                  </label>
                </fieldset>

                {productEditorMode === "custom" && (
                  <ul className="mt-4 space-y-2 rounded-lg border border-zinc-100 bg-zinc-50/80 p-3">
                    {EXPANSION_PRODUCTS.map((p) => (
                      <li key={p.key}>
                        <label className="flex cursor-pointer items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={productEditorKeys.has(p.key)}
                            onChange={() => toggleProductEditorKey(p.key)}
                            className="mt-0.5 rounded"
                          />
                          <span>
                            <span className="font-medium text-zinc-900">{p.label}</span>
                            <span className="block text-xs text-zinc-600">{p.description}</span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}

                {productEditorError && (
                  <p className="mt-3 text-sm text-red-600">{productEditorError}</p>
                )}

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setProductEditorUser(null)}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={productEditorSaving}
                    onClick={async () => {
                      if (!productEditorUser) return;
                      setProductEditorSaving(true);
                      setProductEditorError(null);
                      try {
                        const value = productEditorMode === "all" ? null : Array.from(productEditorKeys);
                        const r = await api.admin.updateUserEntitlements(productEditorUser.id, value);
                        setAdminUsers((prev) =>
                          prev.map((x) =>
                            x.id === productEditorUser.id
                              ? { ...x, enabledProductKeys: r.enabledProductKeys ?? value }
                              : x
                          )
                        );
                        setProductEditorUser(null);
                      } catch (e) {
                        setProductEditorError(e instanceof Error ? e.message : "Save failed");
                      } finally {
                        setProductEditorSaving(false);
                      }
                    }}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    {productEditorSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </div>
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
    </div>
  );
}
