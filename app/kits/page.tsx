"use client";

import Link from "next/link";
import AppNav from "@/components/AppNav";
import { useAuth } from "@/contexts/AuthContext";

export default function KitsPage() {
  const { user, loading, accountType } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
      </div>
    );
  }

  if (!user || accountType !== "agency") {
    return (
      <div className="min-h-screen bg-zinc-50">
        <AppNav />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-zinc-600">Vertical kits are available to agency accounts.</p>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
            Home
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Home
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-zinc-900">Vertical kits</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Backend routes <code className="rounded bg-zinc-200 px-1">GET /api/agency/kits</code> and{" "}
          <code className="rounded bg-zinc-200 px-1">POST /api/agency/kits/:kitId/install</code> are live. Super-admins can
          manage kits via <code className="rounded bg-zinc-200 px-1">GET/POST /api/admin/vertical-kits</code>. A full
          marketplace UI will list assigned kits here next.
        </p>
      </main>
    </div>
  );
}
