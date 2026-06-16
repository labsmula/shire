import { createProfileRouteHandlers } from "@/lib/server/profile-route";

export const runtime = "nodejs";

const handlers = createProfileRouteHandlers("recruiter");

export const GET = handlers.GET;
export const PUT = handlers.PUT;
