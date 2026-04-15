"use client";

import Link from "next/link";
import AppNav from "@/components/AppNav";
import { useAuth } from "@/contexts/AuthContext";

export default function DfyPlaceholder() {
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
          <p className="text-zinc-600">DFY dashboard is for agency accounts.</p>
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
        <h1 className="mt-4 text-2xl font-bold text-zinc-900">DFY clients</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Module 5 (done-for-you engagements) schema is ready. REST routes and UI are planned next.
        </p>
      </main>
    </div>
  );
}
