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
    <nav className="app-nav">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-5">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl"
          >
            SkyVault AI Allocation
          </Link>
          <div className="flex flex-wrap gap-0.5">
            <Link
              href="/"
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname === "/"
                  ? "bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200/80"
                  : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
              }`}
            >
              Home
            </Link>
            <Link
              href="/help"
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname === "/help" || pathname?.startsWith("/help/")
                  ? "bg-sky-50 text-sky-900 ring-1 ring-sky-200/80"
                  : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
              }`}
            >
              Help
            </Link>
            <Link
              href="/content-strategy"
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname?.startsWith("/content-strategy")
                  ? "bg-violet-100 text-violet-900 ring-1 ring-violet-200/80"
                  : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
              }`}
            >
              Content
            </Link>
            <Link
              href="/manager"
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname?.startsWith("/manager")
                  ? "bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200/80"
                  : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
              }`}
            >
              Campaign Manager
            </Link>
            {accountType === "agency" && (
              <Link
                href="/agency"
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  pathname === "/agency"
                    ? "bg-violet-100 text-violet-900 ring-1 ring-violet-200/80"
                    : "text-violet-700 hover:bg-violet-50/90 hover:text-violet-900"
                }`}
              >
                {viewingAsEmail ? "Switch client" : "Select client"}
              </Link>
            )}
            {pathname?.startsWith("/campaigns/") && (
              <Link
                href="/"
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100/80 hover:text-zinc-900"
              >
                Back to Home
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  pathname?.startsWith("/admin")
                    ? "bg-amber-100 text-amber-900 ring-1 ring-amber-200/80"
                    : "text-amber-700 hover:bg-amber-50/90 hover:text-amber-900"
                }`}
              >
                Admin
              </Link>
            )}
            {accountType === "agency" && canUse("white_label") && (
              <Link
                href="/settings/white-label"
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  pathname?.startsWith("/settings")
                    ? "bg-slate-200/80 text-slate-900"
                    : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
                }`}
              >
                White label
              </Link>
            )}
            {accountType === "agency" && canUse("kits") && (
              <Link
                href="/kits"
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  pathname === "/kits"
                    ? "bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200/80"
                    : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
                }`}
              >
                Kits
              </Link>
            )}
            {accountType === "agency" && canUse("dfy") && (
              <Link
                href="/dfy"
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  pathname?.startsWith("/dfy")
                    ? "bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200/80"
                    : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
                }`}
              >
                DFY
              </Link>
            )}
            {canUse("landing_pages") && (
              <Link
                href="/landing-pages"
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  pathname?.startsWith("/landing-pages")
                    ? "bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200/80"
                    : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
                }`}
              >
                Landing pages
              </Link>
            )}
            {canUse("reports") && (
              <Link
                href="/reports"
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  pathname?.startsWith("/reports")
                    ? "bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200/80"
                    : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
                }`}
              >
                Reports
              </Link>
            )}
            {canUse("competitors") && (
              <Link
                href="/competitors/harvest"
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  pathname?.startsWith("/competitors")
                    ? "bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200/80"
                    : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900"
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
              {accountType === "single" && !viewingAsEmail && (
                <span
                  className="hidden rounded-md border border-zinc-200 bg-zinc-100/80 px-2 py-0.5 text-xs font-medium text-zinc-700 sm:inline"
                  title="Solo: one business and your ad accounts. Switch to an agency plan if you manage clients in-app."
                >
                  Solo
                </span>
              )}
              {accountType === "agency" && !viewingAsEmail && (
                <span
                  className="hidden rounded-md border border-violet-200 bg-violet-100/60 px-2 py-0.5 text-xs font-medium text-violet-900 sm:inline"
                  title="Agency: add clients and use Select client to work in their accounts."
                >
                  Agency
                </span>
              )}
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
