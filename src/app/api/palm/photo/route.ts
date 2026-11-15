import type { NextRequest } from "next/server";
import { ApiError, ok, route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { rateLimit } from "@/lib/server/ratelimit";
import { putObject, sniffImage } from "@/lib/server/storage";
import crypto from "node:crypto";
import { palmPhotoKey } from "@/lib/server/services";

/** The palm reading API accepts up to 5 MB; the browser compresses before uploading. */
const MAX = 5 * 1024 * 1024;

/** Upload a palm photo (logged-in customers) → stored privately in their S3 folder; returns its id for the order. */
export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  const rl = await rateLimit(`palm-photo:${user.id}`, 20, 3600);
  if (!rl.ok) throw new ApiError(429, "RATE_LIMITED", "Too many uploads. Please wait a few minutes.", { retryAfter: rl.retryAfter });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new ApiError(422, "VALIDATION", "Choose a photo of your palm.");
  if (file.size > MAX) throw new ApiError(413, "TOO_LARGE", "The photo must be under 5 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const img = sniffImage(bytes);
  if (!img) throw new ApiError(422, "BAD_IMAGE", "Please upload a JPG, PNG or WebP photo.");
  const id = crypto.randomBytes(16).toString("hex");
  await putObject(palmPhotoKey(user.uid, id), bytes, img.type);
  return ok({ photo: id });
});
