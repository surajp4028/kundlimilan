import type { NextRequest } from "next/server";
import { ApiError, ok, readJson, route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { deleteProfile, profileSchema, updateProfile } from "@/lib/server/profiles";

type Ctx = { params: Promise<{ id: string }> };
const pid = (s: string) => {
  const n = Number(s);
  if (!Number.isInteger(n) || n < 1) throw new ApiError(400, "BAD_ID", "Invalid id");
  return n;
};
export const PUT = route<Ctx>(async (req: NextRequest, { params }) => {
  const user = await requireUser();
  const body = await readJson(req, profileSchema);
  if (!(await updateProfile(user.id, pid((await params).id), body))) throw new ApiError(404, "NOT_FOUND", "Profile not found");
  return ok({});
});
export const DELETE = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  if (!(await deleteProfile(user.id, pid((await params).id)))) throw new ApiError(404, "NOT_FOUND", "Profile not found");
  return ok({});
});
