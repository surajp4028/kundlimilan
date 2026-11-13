import type { NextRequest } from "next/server";
import { ApiError, ok, readJson, route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { addProfile, listProfiles, profileSchema } from "@/lib/server/profiles";
import { getNumberSetting } from "@/lib/server/settings";

export const GET = route(async () => {
  const user = await requireUser();
  return ok({ profiles: await listProfiles(user.id), max: await getNumberSetting("max_birth_profiles", 20) });
});

export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await readJson(req, profileSchema);
  const max = await getNumberSetting("max_birth_profiles", 20);
  const id = await addProfile(user.id, body, max);
  if (!id) throw new ApiError(409, "LIMIT", `You can save up to ${max} profiles.`);
  return ok({ id });
});
