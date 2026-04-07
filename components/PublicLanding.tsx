import Link from "next/link";

const features = [
  {
    title: "Multi-platform campaigns",
    body: "Plan and track campaigns for Meta (Facebook & Instagram), Google Ads, and TikTok from one place.",
  },
  {
    title: "AI-generated ad copy",
    body: "Describe your offer and audience; we generate multiple variants you can edit, reorder, and test.",
  },
  {
    title: "Creatives & library",
    body: "Generate images with AI, upload your own, or pull from your creative library and attach them to variants.",
  },
  {
    title: "Integrations",
    body: "Connect your ad accounts securely so you can launch and manage live or paused campaigns when you are ready.",
  },
  {
    title: "Launch & optimize",
    body: "Set budgets and destinations, launch to your connected platforms, and run AI performance reviews with optional optimization modes.",
  },
  {
    title: "Agency-friendly",
    body: "Support for agency accounts and managing clients under one roof when your workspace is configured for it.",
  },
];

export function PublicLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white font-sans text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-lg font-bold tracking-tight text-zinc-900">
            SkyVault AI Allocation
          </Link>
          <nav className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/contact"
              className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 sm:inline-flex"
            >
              Contact
            </Link>
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <p className="text-center text-sm font-medium uppercase tracking-wide text-blue-600">Campaign workflow</p>
          <h1 className="mt-3 text-center text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Build, launch, and refine ads with AI
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-center text-lg text-zinc-600">
            SkyVault AI Allocation helps teams create structured campaigns, generate copy and creatives, connect major ad
            platforms, and push live when your accounts and policies are ready—without juggling five different tools.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/signup"
              className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-md hover:bg-blue-700 sm:w-auto"
            >
              Create free account
            </Link>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-xl border-2 border-zinc-300 bg-white px-8 py-3.5 text-base font-semibold text-zinc-800 hover:bg-zinc-50 sm:w-auto"
            >
              Log in
            </Link>
          </div>
        </section>

        <section className="border-t border-zinc-100 bg-white py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-bold text-zinc-900 sm:text-3xl">What you can do here</h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-zinc-600">
              Everything below is available after you sign in and connect the platforms you use.
            </p>
            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <li
                  key={f.title}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <h3 className="font-semibold text-zinc-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-zinc-100 py-16">
          <div className="mx-auto max-w-3xl rounded-2xl border border-blue-100 bg-blue-50/60 px-6 py-10 text-center sm:px-10">
            <h2 className="text-xl font-bold text-zinc-900 sm:text-2xl">Ready to start?</h2>
            <p className="mt-2 text-zinc-600">
              Create an account to open the dashboard, connect Meta, Google, or TikTok, and build your first campaign.
            </p>
            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href="/signup"
                className="inline-flex justify-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Sign up
              </Link>
              <Link
                href="/login"
                className="inline-flex justify-center rounded-xl border border-zinc-300 bg-white px-6 py-3 font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                Log in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 bg-zinc-50 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <p className="text-sm text-zinc-500">
            © {new Date().getFullYear()} SkyVault AI Allocation. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm sm:justify-end">
            <Link href="/contact" className="font-medium text-zinc-600 hover:text-zinc-900">
              Contact us
            </Link>
            <Link href="/privacy" className="font-medium text-zinc-600 hover:text-zinc-900">
              Privacy Policy
            </Link>
            <Link href="/terms" className="font-medium text-zinc-600 hover:text-zinc-900">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
