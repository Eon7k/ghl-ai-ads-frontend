"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Top nav for Campaigns and Integrations so testing is easy: jump between sections without hunting for links.
 */
export default function AppNav() {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();

  return (
    <nav className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-lg font-bold text-zinc-900 hover:text-zinc-700"
          >
            AI Ad Manager
          </Link>
          <div className="flex gap-1">
            <Link
              href="/"
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                pathname === "/"
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              Home
            </Link>
            {pathname?.startsWith("/campaigns/") && (
              <Link
                href="/"
                className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              >
                Back to Home
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  pathname?.startsWith("/admin")
                    ? "bg-amber-100 text-amber-900"
                    : "text-amber-700 hover:bg-amber-50 hover:text-amber-900"
                }`}
              >
                Admin
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <>
              <span className="text-sm text-zinc-500">{user.email}</span>
              <button
                type="button"
                onClick={logout}
                className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline"
              >
                Log out
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
