"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";

/**
 * Wraps experiments routes: redirects to /login if there is no auth token.
 * Renders children once we know the user has a token (so API calls will include it).
 */
export default function ExperimentsAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setAllowed(true);
  }, [router]);

  if (!allowed) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <p className="text-zinc-600">Checking login…</p>
      </div>
    );
  }

  return <>{children}</>;
}
