import Link from "next/link";
import { HomeClient } from "./HomeClient";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans">
      <main className="flex flex-col items-center justify-center gap-8 py-16 px-8 text-center">
        <h1 className="text-3xl font-bold text-zinc-900">
          AI Ad Manager
        </h1>
        <p className="max-w-md text-lg text-zinc-600">
          Create and manage campaigns, generate ad copy with AI, and optimize budgets.
        </p>
        <HomeClient />
        <Link
          href="/backend-check"
          className="inline-block border-2 border-zinc-300 bg-white px-8 py-4 rounded-lg font-semibold text-lg text-zinc-700 hover:bg-zinc-50"
        >
          Check backend connection
        </Link>
      </main>
    </div>
  );
}
