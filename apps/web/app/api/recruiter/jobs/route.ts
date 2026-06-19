import { createJobsRouteHandlers } from "@/lib/server/jobs-route";

export const runtime = "nodejs";

const handlers = createJobsRouteHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
