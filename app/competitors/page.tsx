"use client";

import Link from "next/link";
import AppNav from "@/components/AppNav";
import { ExpansionProductGate } from "@/components/ExpansionProductGate";

function CompetitorsPlaceholderInner() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Home
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-zinc-900">Competitors</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Module 6 (competitor ad spy) schema is ready. Scan/analyze services and UI are planned next.
        </p>
      </main>
    </div>
  );
}

export default function CompetitorsPlaceholder() {
  return (
    <ExpansionProductGate productKey="competitors">
      <CompetitorsPlaceholderInner />
    </ExpansionProductGate>
  );
}
