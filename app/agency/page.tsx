"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { setViewingAs } from "@/lib/viewingAs";
import AppNav from "@/components/AppNav";

export default function AgencyPage() {
  const { user, accountType, loading } = useAuth();
  const router = useRouter();
  const [selecting, setSelecting] = useState<string | null>(null);
  const [clients, setClients] = useState<{ id: string; email: string; loginDisabled?: boolean }[]>([]);
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

  function selectClient(clientId: string) {
    setSelecting(clientId);
    setViewingAs(clientId);
    router.push("/");
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
        return [{ id: res.client.id, email: res.client.email, loginDisabled: res.client.loginDisabled }, ...prev];
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
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold text-zinc-900">Agency clients</h1>
        <p className="mt-1 text-sm text-zinc-600">Add clients, choose whether they can log in, then select who you’re viewing.</p>

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
                      <p className="mt-0.5 text-xs text-zinc-500">{c.loginDisabled ? "Client login: disabled" : "Client login: enabled"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => selectClient(c.id)}
                        disabled={selecting !== null}
                        className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                      >
                        {selecting === c.id ? "Opening…" : "View as client"}
                      </button>
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
