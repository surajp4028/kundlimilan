import { ApiError, ok, route } from "@/lib/server/http";
import { getService, publicService } from "@/lib/server/services";

type Ctx = { params: Promise<{ slug: string }> };
export const GET = route<Ctx>(async (_req, { params }) => {
  const s = await getService((await params).slug);
  if (!s || s.status !== "active") throw new ApiError(404, "NOT_FOUND", "This report is not available.");
  return ok({ service: publicService(s) });
});
