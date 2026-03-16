"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import type { Experiment } from "@/lib/types";
import AppNav from "@/components/AppNav";

export function HomeClient() {
  const { user, loading, logout } = useAuth();
  const [campaigns, setCampaigns] = useState<Experiment[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setCampaignsLoading(true);
    api
      .listExperiments()
      .then(setCampaigns)
      .catch(() => setCampaigns([]))
      .finally(() => setCampaignsLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
      </div>
    );
  }

  if (user) {
    const launchedCount = campaigns.filter((c) => c.status === "launched").length;
    return (
      <>
        <AppNav />
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              Welcome back
            </h1>
            <p className="mt-1 text-zinc-500">
              Manage your campaigns and ad accounts from one place.
            </p>
          </div>

          {/* Quick stats */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-zinc-500">Total campaigns</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900">
                {campaignsLoading ? "—" : campaigns.length}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-zinc-500">Launched</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900">
                {campaignsLoading ? "—" : launchedCount}
              </p>
            </div>
          </div>

          {/* Primary actions */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Link
              href="/campaigns"
              className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">Campaigns</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Create, edit, and launch campaigns. View performance and adjust budgets.
                  </p>
                  <span className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700">
                    Open Campaigns
                    <svg className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
              </div>
            </Link>

            <Link
              href="/integrations"
              className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">Integrations</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Connect Meta, Google, or TikTok to run and track campaigns.
                  </p>
                  <span className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700">
                    Manage connections
                    <svg className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
                <div className="rounded-lg bg-zinc-100 p-3 text-zinc-600">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.172-1.172a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.172 1.172a4 4 0 01-5.656 0L11.29 7.29a4 4 0 010-5.656z" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>

          {/* Secondary */}
          <div className="mt-8 border-t border-zinc-200 pt-8">
            <Link
              href="/backend-check"
              className="text-sm text-zinc-500 hover:text-zinc-700 hover:underline"
            >
              Check backend connection
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <main className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          AI Ad Manager
        </h1>
        <p className="mt-3 text-zinc-600">
          Create and manage campaigns, generate ad copy with AI, and optimize budgets.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-3.5 font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-xl border-2 border-zinc-300 bg-white px-8 py-3.5 font-semibold text-zinc-700 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2"
          >
            Sign up
          </Link>
        </div>
        <Link
          href="/backend-check"
          className="mt-6 inline-block text-sm text-zinc-500 hover:text-zinc-700 hover:underline"
        >
          Check backend connection
        </Link>
      </main>
    </div>
  );
}
