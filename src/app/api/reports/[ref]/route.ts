import { NextResponse, type NextRequest } from "next/server";
import { ApiError, route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { exec, queryOne } from "@/lib/server/db";
import { decrypt } from "@/lib/server/crypto";
import { getObject } from "@/lib/server/storage";
import { audit } from "@/lib/server/audit";
import { getClientIp } from "@/lib/server/request";
import { ORDER_REF_RE } from "@/lib/server/orders";
import { rateLimit } from "@/lib/server/ratelimit";

type Ctx = { params: Promise<{ ref: string }> };

/** Streams the customer's own report from private S3 (ownership checked; never a public link). */
export const GET = route<Ctx>(async (req: NextRequest, { params }) => {
  const user = await requireUser();
  const ref = (await params).ref;
  if (!ORDER_REF_RE.test(ref)) throw new ApiError(404, "NOT_FOUND", "Report not found.");
  const rl = await rateLimit(`dl:${user.id}`, 60, 600);
  if (!rl.ok) throw new ApiError(429, "RATE_LIMITED", "Too many downloads. Please wait a few minutes.", { retryAfter: rl.retryAfter });
  const r = await queryOne<{ id: number; file_key_enc: string; service_slug: string }>("SELECT id, file_key_enc, service_slug FROM reports WHERE order_ref = ? AND user_uid = ?", [ref, user.uid]);
  if (!r) throw new ApiError(404, "NOT_FOUND", "Report not found.");
  const obj = await getObject(await decrypt(r.file_key_enc));
  if (!obj) throw new ApiError(404, "NOT_FOUND", "Report file is missing. Please contact support.");
  await exec("UPDATE reports SET download_count = download_count + 1, last_downloaded_at = UTC_TIMESTAMP() WHERE id = ?", [r.id]);
  await audit({ actorType: "user", actorId: user.id, action: "report.download", targetType: "order", targetId: ref, ip: getClientIp(req.headers) });
  const inline = req.nextUrl.searchParams.get("view") === "1";
  return new NextResponse(Buffer.from(obj.body), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${r.service_slug}-${ref}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
