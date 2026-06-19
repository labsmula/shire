import { createJobsRouteHandlers } from "@/lib/server/jobs-route";

export const runtime = "nodejs";

const handlers = createJobsRouteHandlers();

export const PATCH = handlers.PATCH;
