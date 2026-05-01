"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";

/**
 * Redirects to /login if there is no auth token. Use for any protected section.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    startTransition(() => setAllowed(true));
  }, [router]);

  if (!allowed) {
    return (
      <div
        className="flex min-h-[40vh] items-center justify-center p-6"
        role="status"
        aria-live="polite"
        aria-label="Verifying sign-in"
      >
        <p className="text-zinc-600">Checking login…</p>
      </div>
    );
  }

  return <>{children}</>;
}
