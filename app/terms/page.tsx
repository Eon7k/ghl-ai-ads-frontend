import type { Metadata } from "next";
import Link from "next/link";
import { SITE_CONTACT } from "@/lib/siteContact";

export const metadata: Metadata = {
  title: "Terms of Service | SkyVault AI Allocation",
  description: "Terms governing use of SkyVault AI Allocation services.",
};

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="mt-2 text-sm text-zinc-600">
          <strong>Effective date:</strong> April 7, 2026
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-zinc-700 sm:text-base">
          <section>
            <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">1. Services</h2>
            <p className="mt-3">
              SkyVault AI Allocation provides AI-driven advertising optimization, campaign management, and CRM-based communication
              tools.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">2. Platform use</h2>
            <p className="mt-3">Users may:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 sm:pl-6">
              <li>Manage ad campaigns</li>
              <li>Analyze performance insights</li>
              <li>Capture and contact leads</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">3. User responsibilities</h2>
            <p className="mt-3">You agree to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 sm:pl-6">
              <li>Obtain proper consent before contacting leads</li>
              <li>Use accurate and lawful advertising practices</li>
              <li>Comply with all messaging laws, including TCPA</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">4. SMS and messaging compliance</h2>
            <p className="mt-3">You are responsible for:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 sm:pl-6">
              <li>Ensuring leads have opted in before messaging</li>
              <li>Maintaining proof of consent</li>
              <li>Respecting opt-outs (STOP requests) immediately</li>
            </ul>
            <p className="mt-3">We reserve the right to suspend accounts for violations.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">5. Third-party integrations</h2>
            <p className="mt-3">We integrate with:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 sm:pl-6">
              <li>Meta Platforms</li>
              <li>Google</li>
              <li>LinkedIn</li>
              <li>GoHighLevel</li>
            </ul>
            <p className="mt-3">We are not responsible for their services or policies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">6. Prohibited use</h2>
            <p className="mt-3">You may not use the platform for:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 sm:pl-6">
              <li>Spam or unsolicited messaging</li>
              <li>Misleading advertisements</li>
              <li>Illegal services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">7. Termination</h2>
            <p className="mt-3">We may suspend accounts for violations.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">8. Disclaimer</h2>
            <p className="mt-3">Services are provided “as is.”</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">9. Limitation of liability</h2>
            <p className="mt-3">We are not liable for indirect damages.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">10. Contact</h2>
            <p className="mt-3 font-medium text-zinc-900">{SITE_CONTACT.company}</p>
            <ul className="mt-2 list-none space-y-1 text-zinc-700">
              <li>
                Email:{" "}
                <a href={`mailto:${SITE_CONTACT.email}`} className="text-blue-600 hover:underline">
                  {SITE_CONTACT.email}
                </a>
              </li>
              <li>
                Phone:{" "}
                <a href={`tel:${SITE_CONTACT.phoneTel}`} className="text-blue-600 hover:underline">
                  {SITE_CONTACT.phoneDisplay}
                </a>
              </li>
              <li>
                Address: {SITE_CONTACT.addressLine1}, {SITE_CONTACT.addressLine2}
              </li>
            </ul>
          </section>
        </div>

        <p className="mt-10 text-center text-sm text-zinc-500">
          <Link href="/contact" className="font-medium text-blue-600 hover:underline">
            Contact us
          </Link>
          {" · "}
          <Link href="/privacy" className="font-medium text-blue-600 hover:underline">
            Privacy Policy
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
