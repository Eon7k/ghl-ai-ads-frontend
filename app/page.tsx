import { Suspense } from "react";
import { HomeClient } from "./HomeClient";

function HomeFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <Suspense fallback={<HomeFallback />}>
        <HomeClient />
      </Suspense>
    </div>
  );
}
