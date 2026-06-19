import { createCandidateJobsRouteHandlers } from "@/lib/server/jobs-route";

export const runtime = "nodejs";

const handlers = createCandidateJobsRouteHandlers();

export const GET = handlers.GET;
