import type { Metadata } from "next";
import Link from "next/link";
import { SITE_CONTACT } from "@/lib/siteContact";

export const metadata: Metadata = {
  title: "Contact Us | SkyVault AI Allocation",
  description: "Reach SkyVault AI Allocation by email, phone, or mail.",
};

export default function ContactPage() {
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
      <main id="main-content" className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold">Contact us</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
          Questions about our services, your data, or your account? Use any of the options below and we will get back to you
          as soon as we can.
        </p>

        <div className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-zinc-900">{SITE_CONTACT.company}</h2>
          <ul className="mt-6 list-none space-y-4 text-sm text-zinc-700 sm:text-base">
            <li>
              <span className="font-medium text-zinc-900">Email</span>
              <br />
              <a href={`mailto:${SITE_CONTACT.email}`} className="mt-1 inline-block text-blue-600 hover:underline">
                {SITE_CONTACT.email}
              </a>
            </li>
            <li>
              <span className="font-medium text-zinc-900">Phone</span>
              <br />
              <a href={`tel:${SITE_CONTACT.phoneTel}`} className="mt-1 inline-block text-blue-600 hover:underline">
                {SITE_CONTACT.phoneDisplay}
              </a>
            </li>
            <li>
              <span className="font-medium text-zinc-900">Mailing address</span>
              <br />
              <span className="mt-1 block leading-relaxed">
                {SITE_CONTACT.addressLine1}
                <br />
                {SITE_CONTACT.addressLine2}
              </span>
            </li>
          </ul>
        </div>

        <p className="mt-10 text-center text-xs text-zinc-500">
          For privacy-related requests (access, correction, deletion), you can also use the email above as described in our{" "}
          <Link href="/privacy" className="font-medium text-blue-600 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link href="/privacy" className="font-medium text-blue-600 hover:underline">
            Privacy Policy
          </Link>
          {" · "}
          <Link href="/terms" className="font-medium text-blue-600 hover:underline">
            Terms of Service
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
