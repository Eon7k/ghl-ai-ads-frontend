"use client";

import Link from "next/link";
import AppNav from "@/components/AppNav";
import { ExpansionProductGate } from "@/components/ExpansionProductGate";
import { PageGuide } from "@/components/PageGuide";
import { useAuth } from "@/contexts/AuthContext";

function KitsPageInner() {
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
        <main id="main-content" className="mx-auto max-w-3xl px-4 py-8">
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
      <main id="main-content" className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Home
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-zinc-900">Vertical kits</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Pre-built vertical playbooks and assets will appear here when your team assigns them to your agency. The list and
          install experience are still being finished in this UI.
        </p>
        <PageGuide
          className="mt-5"
          title="What this will be (coming soon)"
          steps={[
            "Your admin assigns “kits” to your agency (for example, by industry or offer type).",
            "You will open this page, see each kit, and install one to copy templates, prompts, and settings into this workspace — without leaving the app.",
            "Until the marketplace is available, use Home and the Help page to run paid campaigns. Ask your account owner or SkyVault for timing if this feature is part of your contract.",
          ]}
        />
        <p className="form-hint mt-4 text-xs text-zinc-500">
          Technical note: API routes for listing and installing kits exist on the server; the browser UI to browse and
          install is what is still in progress. See Help → Extra features for the big picture.
        </p>
      </main>
    </div>
  );
}

export default function KitsPage() {
  return (
    <ExpansionProductGate productKey="kits">
      <KitsPageInner />
    </ExpansionProductGate>
  );
}
