import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/legal-page";
import { getPublicSettings } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Terms of use" };

export default async function Page() {
  const s = await getPublicSettings();
  return (
    <LegalPage title="Terms of use" updated="13 November 2026">
      <h2>About the service</h2>
      <p>{s.site_name} provides Vedic astrology calculations, free tools and paid PDF reports generated from the birth details you provide. Results depend on the accuracy of those details, especially the time of birth.</p>
      <h2>Guidance, not guarantees</h2>
      <p>Astrology is a traditional system of interpretation. Our content is for guidance and personal reflection only and is not medical, legal, financial or psychological advice. Please use your own judgement — and consult qualified professionals — for important decisions.</p>
      <h2>Your account</h2>
      <p>You sign in with a one-time code sent to your email or mobile. Keep access to them secure. You are responsible for the birth details you submit and confirm you have the right to share details of other people (for example, for Kundli Milan).</p>
      <h2>Orders & payments</h2>
      <p>Prices are shown before payment and are inclusive of applicable taxes. Payments are processed by Razorpay. A report is generated automatically once your payment is confirmed and remains available in your account. See our <Link href="/refund-policy">refund policy</Link>.</p>
      <h2>Fair use</h2>
      <p>Free tools have daily limits. Automated scraping, reselling or misuse of the service is not allowed and may lead to suspension.</p>
      <h2>Contact</h2>
      <p>{s.company_legal_name} · <a href={`mailto:${s.support_email}`}>{s.support_email}</a> · {s.support_phone}</p>
    </LegalPage>
  );
}
