"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect to campaigns list with create panel open.
 * New campaign form now lives in the dropdown on the campaigns page.
 */
export default function NewCampaignRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/campaigns?open=create");
  }, [router]);
  return (
    <div className="flex min-h-[200px] items-center justify-center bg-zinc-50">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
    </div>
  );
}
