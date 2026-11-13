import { NextResponse } from "next/server";
import { ApiError, route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { orderForUser } from "@/lib/server/orders";
import { buildReceipt } from "@/lib/server/receipt";

type Ctx = { params: Promise<{ ref: string }> };
export const GET = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const o = await orderForUser((await params).ref, user.uid);
  if (!o || o.payment_status === "unpaid") throw new ApiError(404, "NOT_FOUND", "Receipt not available.");
  const bytes = await buildReceipt(o);
  return new NextResponse(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="receipt-${o.order_ref}.pdf"`, "Cache-Control": "private, no-store" },
  });
});
