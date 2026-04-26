import type { Metadata } from "next";
import Link from "next/link";
import { SITE_CONTACT } from "@/lib/siteContact";

/** Default GHL widget URL; override with NEXT_PUBLIC_GHL_FORM_IFRAME_URL if you replace the form. */
const DEFAULT_GHL_FORM_IFRAME = "https://link.apisystem.tech/widget/form/98F4XrKJk4gP45Uy7sZy";

/**
 * Public landing page with an embedded GoHighLevel form.
 * Leads submit to GHL — separate from Meta Instant Forms (Graph leadgen_forms).
 */
const iframeUrl = (process.env.NEXT_PUBLIC_GHL_FORM_IFRAME_URL || DEFAULT_GHL_FORM_IFRAME).trim();

export const metadata: Metadata = {
  title: `Contact | ${SITE_CONTACT.company}`,
  description: `Request information from ${SITE_CONTACT.company}.`,
};

export default function GhlLeadLandingPage() {
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
      <main id="main-content" className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold">Get in touch</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Share your details below and we&apos;ll follow up. Your information is handled according to our{" "}
          <Link href="/privacy" className="font-medium text-blue-600 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        <div className="mt-8 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <iframe
            title="Contact form"
            src={iframeUrl}
            className="min-h-[720px] w-full border-0"
            allow="clipboard-write"
          />
        </div>

        <p className="mt-8 text-center text-sm text-zinc-500">
          <Link href="/data-deletion" className="font-medium text-blue-600 hover:underline">
            User data deletion
          </Link>
          {" · "}
          <Link href="/contact" className="font-medium text-blue-600 hover:underline">
            Contact
          </Link>
        </p>
      </main>
    </div>
  );
}
