import { createApplicationsRouteHandlers } from "@/lib/server/applications-route";

export const runtime = "nodejs";

const handlers = createApplicationsRouteHandlers();

export const GET = handlers.GET;
