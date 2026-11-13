import "server-only";
import { queryOne } from "./db";
import { decrypt } from "./crypto";
import { getAllSettings } from "./settings";
import { receiptPdf } from "./invoice-pdf";
import type { OrderRow } from "./orders";

export async function buildReceipt(o: OrderRow) {
  const u = await queryOne<{ name_enc: string | null; email_enc: string | null; phone_enc: string | null }>("SELECT name_enc, email_enc, phone_enc FROM users WHERE uid = ?", [o.user_uid]);
  const ref = await queryOne<{ n: number | null }>("SELECT SUM(amount_paise) n FROM refunds WHERE order_ref = ? AND status = 'processed'", [o.order_ref]);
  const s = await getAllSettings();
  return receiptPdf({
    brand: { name: s.site_name, legal: s.company_legal_name || s.site_name, email: s.support_email, phone: s.support_phone, address: s.company_address, color: s.brand_color },
    ref: o.order_ref, title: o.title, subject: (await decrypt(o.subject_enc)) || "",
    customer: { name: await decrypt(u?.name_enc), email: await decrypt(u?.email_enc), phone: await decrypt(u?.phone_enc), uid: o.user_uid },
    price: Number(o.price_paise), discount: Number(o.discount_paise), amount: Number(o.amount_paise), coupon: o.coupon_code, refunded: Number(ref?.n || 0),
    paymentId: o.pay_payment_id, method: o.pay_method, paidAt: o.paid_at, createdAt: new Date(o.created_at), status: o.status,
  });
}
