import { NextResponse, type NextRequest } from "next/server";
import { ApiError, route } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { queryOne } from "@/lib/server/db";
import { decrypt } from "@/lib/server/crypto";
import { getObject } from "@/lib/server/storage";
import { audit } from "@/lib/server/audit";
import { getClientIp } from "@/lib/server/request";
import { ORDER_REF_RE } from "@/lib/server/orders";

type Ctx = { params: Promise<{ ref: string }> };
export const GET = route<Ctx>(async (req: NextRequest, { params }) => {
  const a = await requireAdmin("orders.view");
  const ref = (await params).ref;
  if (!ORDER_REF_RE.test(ref)) throw new ApiError(404, "NOT_FOUND", "Report not found");
  const r = await queryOne<{ file_key_enc: string; service_slug: string }>("SELECT file_key_enc, service_slug FROM reports WHERE order_ref = ?", [ref]);
  if (!r) throw new ApiError(404, "NOT_FOUND", "Report not found");
  const obj = await getObject(await decrypt(r.file_key_enc));
  if (!obj) throw new ApiError(404, "NOT_FOUND", "Report file missing on storage");
  await audit({ actorType: "admin", actorId: a.id, action: "report.admin_download", targetType: "order", targetId: ref, ip: getClientIp(req.headers) });
  return new NextResponse(Buffer.from(obj.body), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${r.service_slug}-${ref}.pdf"`, "Cache-Control": "private, no-store" } });
});
