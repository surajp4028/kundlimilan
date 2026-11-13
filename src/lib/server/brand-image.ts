import "server-only";
import { NextResponse } from "next/server";
import { getSetting } from "@/lib/server/settings";
import { decrypt } from "@/lib/server/crypto";
import { getObject } from "@/lib/server/storage";

/** Serves an uploaded brand image (logo / hero) from private S3. */
export async function serveBrandImage(kind: "logo" | "hero") {
  if ((await getSetting(kind === "hero" ? "hero_mode" : "logo_mode")) !== "upload") return new NextResponse(null, { status: 404 });
  const key = await decrypt(await getSetting(kind === "hero" ? "hero_key" : "logo_key"));
  if (!key) return new NextResponse(null, { status: 404 });
  const obj = await getObject(key).catch(() => null);
  if (!obj) return new NextResponse(null, { status: 404 });
  const type = /^image\/(png|jpeg|webp|svg\+xml)$/.test(obj.contentType) ? obj.contentType : "application/octet-stream";
  return new NextResponse(Buffer.from(obj.body), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
