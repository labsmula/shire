import { createApplicationsRouteHandlers } from "@/lib/server/applications-route";

export const runtime = "nodejs";

const handlers = createApplicationsRouteHandlers();

export const POST = handlers.POST;
