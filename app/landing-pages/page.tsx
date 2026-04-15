"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppNav from "@/components/AppNav";
import { ExpansionProductGate } from "@/components/ExpansionProductGate";
import { useAuth } from "@/contexts/AuthContext";
import { expansion, type LandingPageRecord } from "@/lib/api";
function LandingPagesListPageInner() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pages, setPages] = useState<LandingPageRecord[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    setListLoading(true);
    setListError(null);
    try {
      const { pages: rows } = await expansion.landingPages.list();
      setPages(rows);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Could not load landing pages");
      setPages([]);
    } finally {
      setListLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) void load();
  }, [user, load, refetchKey]);

  useEffect(() => {
    const refresh = () => setRefetchKey((k) => k + 1);
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  async function createPage(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    const t = title.trim();
    if (!t) {
      setCreateError("Enter a title");
      return;
    }
    setCreating(true);
    try {
      const { page } = await expansion.landingPages.create({
        title: t,
        status: "draft",
        pageData: {
          headline: t,
          subheadline: "",
          body: "",
          ctaText: "Get started",
          ctaUrl: "",
        },
      });
      setTitle("");
      router.push(`/landing-pages/${page.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Create failed");
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
        <h1 className="mt-4 text-2xl font-bold text-zinc-900">Landing pages</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Build and store page copy and settings per client. Agency accounts: use{" "}
          <Link href="/agency" className="text-violet-700 hover:underline">
            Select client
          </Link>{" "}
          so pages attach to the right account.
        </p>

        <form
          onSubmit={createPage}
          className="mt-8 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="new-lp-title" className="block text-sm font-medium text-zinc-700">
              New page title
            </label>
            <input
              id="new-lp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Spring promo — cryotherapy"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create & edit"}
          </button>
        </form>
        {createError && <p className="mt-2 text-sm text-red-600">{createError}</p>}

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-900">Your pages</h2>
          {listLoading && <p className="mt-3 text-sm text-zinc-500">Loading…</p>}
          {listError && <p className="mt-3 text-sm text-red-600">{listError}</p>}
          {!listLoading && !listError && pages.length === 0 && (
            <p className="mt-3 text-sm text-zinc-600">No landing pages yet. Create one above.</p>
          )}
          <ul className="mt-4 space-y-2">
            {pages.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/landing-pages/${p.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900">{p.title}</p>
                    <p className="truncate text-xs text-zinc-500">
                      /{p.slug} · {p.status}
                      {p.experiment ? ` · ${p.experiment.name}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-violet-700">Edit →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

export default function LandingPagesListPage() {
  return (
    <ExpansionProductGate productKey="landing_pages">
      <LandingPagesListPageInner />
    </ExpansionProductGate>
  );
}
