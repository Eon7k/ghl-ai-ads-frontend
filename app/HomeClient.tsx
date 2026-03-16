"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export function HomeClient() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <span className="text-zinc-500">Loading…</span>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
        <span className="text-sm text-zinc-600">Signed in as {user.email}</span>
        <Link
          href="/experiments"
          className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700"
        >
          Go to Experiments
        </Link>
        <button
          type="button"
          onClick={logout}
          className="inline-block border-2 border-zinc-300 bg-white px-8 py-4 rounded-lg font-semibold text-lg text-zinc-700 hover:bg-zinc-50"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
      <Link
        href="/login"
        className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700"
      >
        Log in
      </Link>
      <Link
        href="/signup"
        className="inline-block border-2 border-zinc-300 bg-white px-8 py-4 rounded-lg font-semibold text-lg text-zinc-700 hover:bg-zinc-50"
      >
        Sign up
      </Link>
    </div>
  );
}
