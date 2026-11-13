import { ok, route } from "@/lib/server/http";
import { listActiveServices, publicService } from "@/lib/server/services";

export const GET = route(async () => ok({ services: (await listActiveServices()).map(publicService) }));
