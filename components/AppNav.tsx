"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getViewingAs } from "@/lib/viewingAs";
import { hasExpansionProduct } from "@/lib/products";

/**
 * Top nav for Campaigns and Integrations so testing is easy: jump between sections without hunting for links.
 */
export default function AppNav() {
  const pathname = usePathname();
  const { user, isAdmin, accountType, clients, logout, enabledProductKeys } = useAuth();
  const viewingAsId = getViewingAs();
  const viewingAsEmail = viewingAsId && clients.find((c) => c.id === viewingAsId)?.email;
  const canUse = (productKey: string) => isAdmin || hasExpansionProduct(enabledProductKeys, productKey);

  return (
    <nav className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-lg font-bold text-zinc-900 hover:text-zinc-700"
          >
            SkyVault AI Allocation
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
            <Link
              href="/content-strategy"
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                pathname?.startsWith("/content-strategy")
                  ? "bg-violet-100 text-violet-900"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              Content
            </Link>
            <Link
              href="/manager"
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                pathname?.startsWith("/manager")
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              Campaign Manager
            </Link>
            {accountType === "agency" && (
              <Link
                href="/agency"
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  pathname === "/agency"
                    ? "bg-violet-100 text-violet-900"
                    : "text-violet-700 hover:bg-violet-50 hover:text-violet-900"
                }`}
              >
                {viewingAsEmail ? "Switch client" : "Select client"}
              </Link>
            )}
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
            {accountType === "agency" && canUse("white_label") && (
              <Link
                href="/settings/white-label"
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  pathname?.startsWith("/settings")
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                White label
              </Link>
            )}
            {accountType === "agency" && canUse("kits") && (
              <Link
                href="/kits"
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  pathname === "/kits"
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                Kits
              </Link>
            )}
            {accountType === "agency" && canUse("dfy") && (
              <Link
                href="/dfy"
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  pathname?.startsWith("/dfy")
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                DFY
              </Link>
            )}
            {canUse("landing_pages") && (
              <Link
                href="/landing-pages"
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  pathname?.startsWith("/landing-pages")
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                Landing pages
              </Link>
            )}
            {canUse("reports") && (
              <Link
                href="/reports"
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  pathname?.startsWith("/reports")
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                Reports
              </Link>
            )}
            {canUse("competitors") && (
              <Link
                href="/competitors"
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  pathname?.startsWith("/competitors")
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                Competitors
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {accountType === "agency" && viewingAsEmail && (
            <span
              className="max-w-[16rem] truncate rounded bg-violet-100 px-2 py-1 text-xs font-medium text-violet-800"
              title="Campaigns, integrations, and business profile are for this client’s account."
            >
              Viewing as: {viewingAsEmail}
            </span>
          )}
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
