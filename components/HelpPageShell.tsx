"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import AppNav from "@/components/AppNav";

/** Help is readable when logged out; logged-in users get the full app nav. */
export function HelpPageShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center app-shell">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-dvh app-shell">
        <AppNav />
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-dvh app-shell font-sans">
      <header className="app-nav">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-5">
          <Link href="/" className="text-lg font-bold text-slate-900">
            SkyVault AI Allocation
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/help"
              className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-900 ring-1 ring-indigo-200/80"
            >
              Help
            </Link>
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
