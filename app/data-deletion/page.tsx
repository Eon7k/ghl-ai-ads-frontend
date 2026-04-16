import type { Metadata } from "next";
import Link from "next/link";
import { SITE_CONTACT } from "@/lib/siteContact";

export const metadata: Metadata = {
  title: "User Data Deletion | SkyVault AI Allocation",
  description:
    "How to disconnect Meta/Facebook, remove SkyVault AI Allocation, and request deletion of your data.",
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="text-sm font-semibold text-zinc-900 hover:text-blue-600">
            ← Home
          </Link>
          <Link href="/login" className="text-sm font-medium text-blue-600 hover:underline">
            Log in
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold">User data deletion</h1>
        <p className="mt-2 text-sm text-zinc-600">
          How to stop our access to your Meta (Facebook) data and ask us to delete information we hold about you.
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-zinc-700 sm:text-base">
          <section>
            <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">1. Remove Meta connection in our product</h2>
            <p className="mt-3">
              After you log in to {SITE_CONTACT.company}, open <strong>Integrations</strong> and disconnect{" "}
              <strong>Meta</strong> (or Facebook). That removes the access token we store for your account so we no longer call
              Meta on your behalf.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">2. Remove the app from your Facebook settings</h2>
            <p className="mt-3">You can also revoke the app at Meta:</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 sm:pl-6">
              <li>
                Go to Facebook → <strong>Settings &amp; privacy</strong> → <strong>Settings</strong>.
              </li>
              <li>
                Open <strong>Business integrations</strong> or <strong>Apps and websites</strong> (wording may vary).
              </li>
              <li>
                Find this app and choose <strong>Remove</strong> / <strong>Disconnect</strong>.
              </li>
            </ol>
            <p className="mt-3 text-zinc-600">
              Meta’s own help center has the latest steps if your menu looks different.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">3. Request deletion of your account data</h2>
            <p className="mt-3">
              To ask us to delete your user account and associated data we control (profile, stored tokens, campaign-related
              records tied to your login), email{" "}
              <a href={`mailto:${SITE_CONTACT.email}?subject=Data%20deletion%20request`} className="font-medium text-blue-600 hover:underline">
                {SITE_CONTACT.email}
              </a>{" "}
              with the subject line <strong>Data deletion request</strong> and include the email address you use to sign in.
            </p>
            <p className="mt-3">
              We will confirm receipt and process verifiable requests within a reasonable time, subject to legal or security
              exceptions (for example, records we must keep for tax or fraud prevention).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">4. What we cannot delete for you</h2>
            <p className="mt-3">
              Data that lives only inside Meta, Google, LinkedIn, or other platforms must be requested through those services. We
              delete what we store on our systems when you ask and when your account allows it.
            </p>
          </section>
        </div>

        <p className="mt-10 text-center text-sm text-zinc-500">
          <Link href="/privacy" className="font-medium text-blue-600 hover:underline">
            Privacy Policy
          </Link>
          {" · "}
          <Link href="/contact" className="font-medium text-blue-600 hover:underline">
            Contact us
          </Link>
          {" · "}
          <Link href="/" className="font-medium text-blue-600 hover:underline">
            Home
          </Link>
        </p>
      </main>
    </div>
  );
}
