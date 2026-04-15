"use client";

import Link from "next/link";
import AppNav from "@/components/AppNav";

export default function LandingPagesPlaceholder() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Home
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-zinc-900">Landing pages</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Module 3 (AI landing page builder) database models are in place. API routes return{" "}
          <strong>501 Not Implemented</strong> until the generator and editor are wired. See{" "}
          <code className="rounded bg-zinc-200 px-1">ghl-ai-backend/PLATFORM_EXPANSION_SETUP.md</code>.
        </p>
      </main>
    </div>
  );
}
