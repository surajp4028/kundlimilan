import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { getPublicSettings } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Privacy policy" };

export default async function Page() {
  const s = await getPublicSettings();
  return (
    <LegalPage title="Privacy policy" updated="13 November 2026">
      <h2>What we collect</h2>
      <ul>
        <li>Account details: name, email and/or mobile number (verified by a one-time code).</li>
        <li>Birth details you enter: name, gender, date, time and place of birth — for you and anyone you add (e.g. for Kundli Milan).</li>
        <li>Order and payment details: what you bought, amounts, payment status. Card / UPI details are handled by Razorpay and never reach us.</li>
        <li>Security data: device, approximate location and IP address of your sessions, so you can see and sign out of devices.</li>
      </ul>
      <h2>How we use it</h2>
      <p>To calculate charts and generate the reports you request, deliver them to you, process payments and refunds, keep your account secure, and answer support requests. Birth details are sent to our astrology calculation provider only to produce your results.</p>
      <h2>How we protect it</h2>
      <p>Personal values — names, contact details, birth details, IP addresses and payment payloads — are encrypted at rest with AES-256-GCM using keys managed by a key management service. Reports are stored privately and can only be downloaded from your signed-in account. Sessions use secure, HttpOnly cookies.</p>
      <h2>Sharing</h2>
      <p>We do not sell your data. We share only what is necessary with service providers who help us run {s.site_name}: payments (Razorpay), astrology calculations, cloud storage, email and SMS delivery.</p>
      <h2>Your rights (DPDP Act, 2023)</h2>
      <p>You can access, correct or delete your data, and withdraw consent, by writing to <a href={`mailto:${s.support_email}`}>{s.support_email}</a>. Records we must keep by law (e.g. payment records) are retained for the legally required period.</p>
      <h2>Grievance officer</h2>
      <p>{s.company_legal_name} · {s.company_address} · <a href={`mailto:${s.support_email}`}>{s.support_email}</a> · {s.support_phone}</p>
    </LegalPage>
  );
}
