import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/** Payment receipt (not a tax invoice) — deep navy + gold, A4. */
const ascii = (s: string) => s.normalize("NFKD").replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();
const money = (p: number) => `INR ${(p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function hexRgb(hex: string) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex) || ["", "e8", "b6", "5a"];
  return rgb(parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255);
}

export async function receiptPdf(r: {
  brand: { name: string; legal: string; email: string; phone: string; address: string; color: string };
  ref: string; title: string; subject: string; customer: { name: string; email: string; phone: string; uid: string };
  price: number; discount: number; amount: number; coupon: string | null; refunded: number;
  paymentId: string | null; method: string | null; paidAt: Date | null; createdAt: Date; status: string;
}) {
  const doc = await PDFDocument.create();
  doc.setTitle(`Receipt ${r.ref}`);
  doc.setAuthor(ascii(r.brand.name));
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const page = doc.addPage([595, 842]);
  const gold = hexRgb(r.brand.color);
  const ink = rgb(0.09, 0.07, 0.2);
  const muted = rgb(0.42, 0.4, 0.52);

  page.drawRectangle({ x: 0, y: 700, width: 595, height: 142, color: rgb(0.043, 0.031, 0.125) });
  page.drawCircle({ x: 530, y: 790, size: 90, borderColor: gold, borderWidth: 0.6, opacity: 0, borderOpacity: 0.35 });
  page.drawCircle({ x: 530, y: 790, size: 60, borderColor: gold, borderWidth: 0.6, opacity: 0, borderOpacity: 0.25 });
  page.drawText(ascii(r.brand.name).toUpperCase(), { x: 48, y: 790, size: 22, font: bold, color: gold });
  page.drawText("PAYMENT RECEIPT", { x: 48, y: 762, size: 11, font, color: rgb(0.85, 0.82, 0.72) });
  page.drawText(ascii(`Receipt for order ${r.ref}`), { x: 48, y: 728, size: 10, font, color: rgb(0.7, 0.67, 0.6) });

  let y = 660;
  const label = (t: string, x: number, yy: number) => page.drawText(ascii(t).toUpperCase(), { x, y: yy, size: 8, font: bold, color: muted });
  const val = (t: string, x: number, yy: number, b = false) => page.drawText(ascii(t).slice(0, 60), { x, y: yy, size: 11, font: b ? bold : font, color: ink });

  label("Billed to", 48, y);
  label("Order", 330, y);
  val(r.customer.name || "Customer", 48, y - 18, true);
  val(`Customer ID ${r.customer.uid}`, 48, y - 34);
  if (r.customer.email) val(r.customer.email, 48, y - 50);
  if (r.customer.phone) val(r.customer.phone, 48, y - 66);
  val(r.ref, 330, y - 18, true);
  val(`Created ${r.createdAt.toISOString().slice(0, 10)}`, 330, y - 34);
  if (r.paidAt) val(`Paid ${new Date(r.paidAt).toISOString().replace("T", " ").slice(0, 16)} UTC`, 330, y - 50);
  val(`Status ${r.status}`, 330, y - 66);

  y -= 110;
  page.drawRectangle({ x: 48, y: y - 6, width: 499, height: 26, color: rgb(0.97, 0.95, 0.9) });
  page.drawText("DESCRIPTION", { x: 60, y: y + 3, size: 8, font: bold, color: muted });
  page.drawText("AMOUNT", { x: 480, y: y + 3, size: 8, font: bold, color: muted });
  y -= 30;
  const row = (t: string, amt: string, b = false, color = ink) => {
    page.drawText(ascii(t).slice(0, 70), { x: 60, y, size: 11, font: b ? bold : font, color });
    const w = (b ? bold : font).widthOfTextAtSize(amt, 11);
    page.drawText(amt, { x: 535 - w, y, size: 11, font: b ? bold : font, color });
    y -= 22;
  };
  row(r.title, money(r.price), true);
  page.drawText(ascii(r.subject).slice(0, 80), { x: 60, y: y + 6, size: 9, font: serif, color: muted });
  y -= 10;
  if (r.discount) row(`Coupon ${r.coupon || ""}`.trim(), `- ${money(r.discount)}`, false, rgb(0.1, 0.5, 0.3));
  page.drawLine({ start: { x: 48, y: y + 8 }, end: { x: 547, y: y + 8 }, thickness: 0.6, color: rgb(0.88, 0.85, 0.78) });
  y -= 6;
  row("Total paid", money(r.amount), true);
  if (r.refunded) row("Refunded", `- ${money(r.refunded)}`, false, rgb(0.7, 0.2, 0.2));

  y -= 16;
  label("Payment", 48, y);
  val(`${r.method ? r.method.toUpperCase() : "Online"} via Razorpay${r.paymentId ? ` · ${r.paymentId}` : ""}`, 48, y - 18);
  y -= 60;
  page.drawText("Prices are inclusive of all applicable taxes. This receipt is computer generated and needs no signature.", { x: 48, y, size: 8.5, font, color: muted });

  page.drawLine({ start: { x: 48, y: 80 }, end: { x: 547, y: 80 }, thickness: 0.6, color: gold });
  page.drawText(ascii(`${r.brand.legal} · ${r.brand.address}`).slice(0, 110), { x: 48, y: 62, size: 8.5, font, color: muted });
  page.drawText(ascii(`${r.brand.email} · ${r.brand.phone}`), { x: 48, y: 48, size: 8.5, font, color: muted });
  return doc.save();
}
