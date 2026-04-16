import type { Metadata } from "next";
import Link from "next/link";
import { SITE_CONTACT } from "@/lib/siteContact";

export const metadata: Metadata = {
  title: "Privacy Policy | SkyVault AI Allocation",
  description: "How SkyVault AI Allocation collects, uses, and protects your information.",
};

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-zinc-600">
          <strong>Effective date:</strong> April 7, 2026
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-zinc-700 sm:text-base">
          <section>
            <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">1. Introduction</h2>
            <p className="mt-3">
              SkyVault AI Allocation (“Company,” “we,” “our,” or “us”) provides AI-powered advertising optimization, campaign
              management, and CRM-enabled communication tools. This Privacy Policy explains how we collect, use, and protect your
              information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">2. Information we collect</h2>

            <h3 className="mt-4 font-semibold text-zinc-900">a. Personal information</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 sm:pl-6">
              <li>Name, email address, phone number</li>
              <li>Business information (company name, role)</li>
              <li>Appointment and inquiry details</li>
            </ul>

            <h3 className="mt-4 font-semibold text-zinc-900">b. Advertising data</h3>
            <p className="mt-2">
              We collect and process campaign data from third-party platforms, including Meta (Facebook/Instagram), Google Ads,
              and LinkedIn Ads. This includes:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 sm:pl-6">
              <li>Ad performance metrics</li>
              <li>Engagement data</li>
              <li>Audience insights</li>
            </ul>

            <h3 className="mt-4 font-semibold text-zinc-900">c. Lead and messaging data</h3>
            <p className="mt-2">When users interact with ads and submit forms, we collect:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 sm:pl-6">
              <li>Contact details submitted via forms or landing pages</li>
              <li>Consent records (timestamp, source, opt-in language)</li>
              <li>SMS communication history</li>
            </ul>

            <h3 className="mt-4 font-semibold text-zinc-900">d. Technical data</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 sm:pl-6">
              <li>IP address, browser type, device information</li>
              <li>Platform usage data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">3. How we use information</h2>
            <p className="mt-3">We use data to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 sm:pl-6">
              <li>Analyze and improve ad performance using AI</li>
              <li>Manage and optimize advertising campaigns</li>
              <li>Contact leads who have requested information or services</li>
              <li>Schedule appointments and follow up via SMS or email</li>
              <li>Operate CRM workflows through integrated systems</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">4. SMS communications and A2P compliance</h2>
            <p className="mt-3">
              By submitting your information through our ads or forms, you consent to receive SMS messages from SkyVault AI
              Allocation, including:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 sm:pl-6">
              <li>Appointment scheduling and reminders</li>
              <li>Follow-ups related to your inquiry</li>
              <li>Marketing messages (if applicable)</li>
            </ul>
            <p className="mt-3">Message frequency may vary. Message and data rates may apply.</p>
            <p className="mt-3">You can opt out at any time by replying STOP. For help, reply HELP.</p>
            <p className="mt-3">Consent is collected at the point of lead submission and is not a condition of purchase.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">5. Third-party services</h2>
            <p className="mt-3">We integrate with third-party platforms including:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 sm:pl-6">
              <li>Meta Platforms (Facebook and Instagram Ads)</li>
              <li>Google (Google Ads)</li>
              <li>LinkedIn</li>
              <li>GoHighLevel (CRM and messaging infrastructure)</li>
            </ul>
            <p className="mt-3">These providers may process data in accordance with their own policies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">6. Data sharing</h2>
            <p className="mt-3">We do not sell personal data. We may share information with:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 sm:pl-6">
              <li>CRM and messaging providers</li>
              <li>Advertising platforms</li>
              <li>Service providers necessary to operate the business</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">7. Data retention</h2>
            <p className="mt-3">We retain data only as long as necessary for business and legal purposes.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">8. Data security</h2>
            <p className="mt-3">We implement reasonable safeguards to protect your data.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">9. Your rights</h2>
            <p className="mt-3">
              You may request access, correction, or deletion of your data by contacting us at{" "}
              <a href={`mailto:${SITE_CONTACT.email}`} className="font-medium text-blue-600 hover:underline">
                {SITE_CONTACT.email}
              </a>
              . For Meta/Facebook login and step-by-step removal instructions, see our{" "}
              <Link href="/data-deletion" className="font-medium text-blue-600 hover:underline">
                User data deletion
              </Link>{" "}
              page.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">10. Updates</h2>
            <p className="mt-3">We may update this policy periodically.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">11. Contact</h2>
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
          <Link href="/data-deletion" className="font-medium text-blue-600 hover:underline">
            User data deletion
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
