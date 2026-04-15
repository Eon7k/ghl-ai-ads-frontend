"use client";

import Link from "next/link";
import AppNav from "@/components/AppNav";
import { useAuth } from "@/contexts/AuthContext";
import { EXPANSION_PRODUCTS, hasExpansionProduct } from "@/lib/products";

export function ExpansionProductGate({
  productKey,
  children,
}: {
  productKey: (typeof EXPANSION_PRODUCTS)[number]["key"];
  children: React.ReactNode;
}) {
  const { user, loading, isAdmin, enabledProductKeys } = useAuth();
  const label = EXPANSION_PRODUCTS.find((p) => p.key === productKey)?.label ?? productKey;
  const allowed = isAdmin || hasExpansionProduct(enabledProductKeys, productKey);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-violet-600" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <AppNav />
        <main className="mx-auto max-w-lg px-4 py-12">
          <h1 className="text-xl font-semibold text-zinc-900">{label} is not enabled</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Your account does not include this module. Contact your administrator if you need access.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm text-violet-700 hover:underline">
            ← Home
          </Link>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}
