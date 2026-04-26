"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { setViewingAs } from "@/lib/viewingAs";
import AppNav from "@/components/AppNav";
import { PageGuide } from "@/components/PageGuide";

export default function AgencyPage() {
  const { user, accountType, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [selecting, setSelecting] = useState<string | null>(null);
  const [clients, setClients] = useState<
    { id: string; email: string; loginDisabled?: boolean; businessOnboardingComplete: boolean | null }[]
  >([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [allowLogin, setAllowLogin] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && accountType !== "agency") {
      router.replace("/");
    }
  }, [loading, accountType, router]);

  useEffect(() => {
    if (loading || !user || accountType !== "agency") return;
    setClientsLoading(true);
    api.agency
      .listClients()
      .then(setClients)
      .catch(() => setClients([]))
      .finally(() => setClientsLoading(false));
  }, [loading, user, accountType]);

  async function selectClient(clientId: string) {
    setSelecting(clientId);
    try {
      setViewingAs(clientId);
      await refreshUser();
      router.push("/");
    } finally {
      setSelecting(null);
    }
  }

  async function goToAgencyOwnBusinessProfile() {
    setViewingAs(null);
    await refreshUser();
    router.push("/onboarding/business?edit=1");
  }

  async function goToClientBusinessProfile(clientId: string) {
    setViewingAs(clientId);
    await refreshUser();
    router.push("/onboarding/business");
  }

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setTempPassword(null);
    const email = createEmail.trim().toLowerCase();
    if (!email) return;
    setCreating(true);
    try {
      const res = await api.agency.addClient(email, allowLogin);
      setClients((prev) => {
        const exists = prev.some((c) => c.id === res.client.id);
        if (exists) return prev;
        return [
          {
            id: res.client.id,
            email: res.client.email,
            loginDisabled: res.client.loginDisabled,
            businessOnboardingComplete: res.client.businessOnboardingComplete,
          },
          ...prev,
        ];
      });
      setCreateEmail("");
      if (res.tempPassword) setTempPassword(res.tempPassword);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to add client");
    } finally {
      setCreating(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans">
        <AppNav />
        <div className="mx-auto max-w-2xl px-4 py-12">
          <p className="text-zinc-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (accountType !== "agency") {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <AppNav />
      <main id="main-content" className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold text-zinc-900">Agency clients</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Add clients, then use <strong>View as client</strong> to work in their ad accounts and{" "}
          <strong>their</strong> business profile. Your agency has its own profile (separate from each client).
        </p>

        <PageGuide
          className="mt-5"
          title="Agency: what to do here"
          steps={[
            "Add a client with their real email. If you show a temporary password, copy it and give it to the client through a secure channel — you will not see it again.",
            "Click View as client to switch your workspace. Home, integrations, campaigns, and business onboarding then apply to that client until you switch back or clear the selection from the top bar (Select client / Switch client).",
            "To edit your agency’s own business profile (not a client’s), use the “Your agency account” block below, or go there from Help → Agency & clients. Client profiles are set while you are viewing as that client and open the business questionnaire from Home if prompted or from the Content page link.",
          ]}
        />

        <section className="mt-6 rounded-xl border border-violet-200 bg-violet-50/50 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-violet-950">Your agency account</h2>
          <p className="mt-1 text-sm text-violet-900/90">
            Logged in as <span className="font-medium">{user?.email}</span>. Business model and content strategy can be
            set for this agency user independently of any client.
          </p>
          <button
            type="button"
            onClick={goToAgencyOwnBusinessProfile}
            className="mt-3 rounded-lg border border-violet-300 bg-white px-3 py-2 text-sm font-medium text-violet-900 hover:bg-violet-100"
          >
            Set or edit your agency’s business profile
          </button>
        </section>

        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Add a client</h2>
          <form onSubmit={createClient} className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Client email</label>
              <input
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="client@example.com"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={allowLogin}
                onChange={(e) => setAllowLogin(e.target.checked)}
                className="rounded"
              />
              Client can log in to their own portal
            </label>
            {tempPassword && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
                <p className="font-medium">Temporary password created</p>
                <p className="mt-1 text-xs text-green-800">Give this to your client so they can log in. (You won’t see it again.)</p>
                <p className="mt-2 font-mono text-sm">{tempPassword}</p>
              </div>
            )}
            {createError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{createError}</div>
            )}
            <button
              type="submit"
              disabled={creating || !createEmail.trim()}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {creating ? "Adding…" : "Add client"}
            </button>
          </form>
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">Your clients</h2>
            <Link href="/" className="text-sm text-zinc-600 hover:underline">Back to Home</Link>
          </div>
          {clientsLoading ? (
            <p className="mt-3 text-sm text-zinc-500">Loading clients…</p>
          ) : clients.length === 0 ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-6">
              <p className="font-medium text-amber-900">No clients yet</p>
              <p className="mt-1 text-sm text-amber-800">Add your first client above.</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {clients.map((c) => (
                <li key={c.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-900">{c.email}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {c.loginDisabled ? "Client login: disabled" : "Client login: enabled"} ·{" "}
                        {c.businessOnboardingComplete === false
                          ? "Business profile: not completed"
                          : c.businessOnboardingComplete === true
                            ? "Business profile: set or skipped"
                            : "Business profile: not prompted (before update)"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => selectClient(c.id)}
                        disabled={selecting !== null}
                        className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                      >
                        {selecting === c.id ? "Opening…" : "View as client"}
                      </button>
                      {c.businessOnboardingComplete === false && (
                        <button
                          type="button"
                          onClick={() => goToClientBusinessProfile(c.id)}
                          disabled={selecting !== null}
                          className="rounded-lg border border-violet-300 bg-white px-3 py-2 text-sm font-medium text-violet-900 hover:bg-violet-50 disabled:opacity-50"
                        >
                          Client business profile
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={removingId !== null}
                        onClick={async () => {
                          setRemovingId(c.id);
                          try {
                            await api.agency.removeClient(c.id);
                            setClients((prev) => prev.filter((x) => x.id !== c.id));
                          } finally {
                            setRemovingId(null);
                          }
                        }}
                        className="text-sm text-red-600 hover:underline disabled:opacity-50"
                      >
                        {removingId === c.id ? "Removing…" : "Remove"}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
