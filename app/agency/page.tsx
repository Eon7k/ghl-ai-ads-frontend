"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { setViewingAs } from "@/lib/viewingAs";
import AppNav from "@/components/AppNav";

export default function AgencyPage() {
  const { user, accountType, clients, loading } = useAuth();
  const router = useRouter();
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && accountType !== "agency") {
      router.replace("/");
    }
  }, [loading, accountType, router]);

  function selectClient(clientId: string) {
    setSelecting(clientId);
    setViewingAs(clientId);
    router.push("/");
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
        <h1 className="text-2xl font-bold text-zinc-900">Select client</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Choose which client to view. You’ll see their campaigns, creatives, and integrations.
        </p>
        {clients.length === 0 ? (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50/80 p-6">
            <p className="font-medium text-amber-900">No clients assigned</p>
            <p className="mt-1 text-sm text-amber-800">
              Ask an admin to add clients to your agency account from the Admin → Users section.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-300"
            >
              Back to Home
            </Link>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {clients.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => selectClient(c.id)}
                  disabled={selecting !== null}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-4 text-left shadow-sm transition hover:border-violet-300 hover:bg-violet-50/50 disabled:opacity-50"
                >
                  <span className="font-medium text-zinc-900">{c.email}</span>
                  {selecting === c.id ? (
                    <span className="ml-2 text-sm text-zinc-500">Opening…</span>
                  ) : (
                    <span className="ml-2 text-sm text-violet-600">View dashboard →</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
