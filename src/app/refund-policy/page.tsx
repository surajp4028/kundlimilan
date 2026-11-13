import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { getPublicSettings } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Refund policy" };

export default async function Page() {
  const s = await getPublicSettings();
  return (
    <LegalPage title="Refund & cancellation" updated="13 November 2026">
      <h2>Digital reports</h2>
      <p>Reports are personalised digital products generated instantly after payment, so they are not refundable once delivered — except in the cases below.</p>
      <h2>Full refund</h2>
      <ul>
        <li>If your report cannot be generated, we retry automatically and, if it still fails, refund the full amount to your original payment method.</li>
        <li>If you were charged but no order was confirmed, or charged twice, the extra amount is refunded.</li>
      </ul>
      <h2>Wrong birth details</h2>
      <p>If you entered incorrect details by mistake, write to us within 48 hours of purchase with your order number — we&apos;ll help you get a corrected report.</p>
      <h2>Timelines</h2>
      <p>Refunds are initiated within 2 working days and usually reach your account in 5–7 working days, depending on your bank.</p>
      <h2>Contact</h2>
      <p><a href={`mailto:${s.support_email}`}>{s.support_email}</a> · {s.support_phone}</p>
    </LegalPage>
  );
}
