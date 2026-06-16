import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AuthenticatedUserConfigurationError,
  AuthenticatedUserError,
  resolveAuthenticatedUser,
  type AuthenticatedUser,
} from "@/lib/server/authenticated-user";
import { DatabaseConfigurationError } from "@/lib/server/db";
import {
  createDrizzleProfileRepository,
  ProfileRepositoryError,
  type ProfileRepository,
} from "@/lib/server/profile-repository";

export const runtime = "nodejs";

type CandidateCvJobRouteDependencies = {
  resolveAuthenticatedUser?: (request: Request) => Promise<AuthenticatedUser>;
  repository?: ProfileRepository;
  fetch?: typeof fetch;
};

const attempts = {
  attempts: z.number().int().nonnegative().optional(),
  maxAttempts: z.number().int().positive().optional(),
};

const upstreamCvJobSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("queued"), ...attempts }),
  z.object({ status: z.literal("active"), ...attempts }),
  z.object({
    status: z.literal("delayed"),
    ...attempts,
    nextRetryAt: z.string().optional(),
  }),
  z.object({
    status: z.literal("completed"),
    ...attempts,
    result: z.object({
      profile: z.record(z.string(), z.unknown()),
    }),
  }),
  z.object({
    status: z.literal("failed"),
    ...attempts,
    error: z.object({ message: z.string() }),
  }),
]);

function publicCvJob(input: z.infer<typeof upstreamCvJobSchema>) {
  const retry = {
    attempts: input.attempts,
    maxAttempts: input.maxAttempts,
  };
  if (input.status === "completed") {
    return {
      status: input.status,
      ...retry,
      result: { profile: input.result.profile },
    };
  }
  if (input.status === "failed") {
    return {
      status: input.status,
      ...retry,
      error: { message: input.error.message },
    };
  }
  if (input.status === "delayed") {
    return { status: input.status, ...retry, nextRetryAt: input.nextRetryAt };
  }
  return { status: input.status, ...retry };
}

export function createCandidateCvJobGetHandler(
  dependencies: CandidateCvJobRouteDependencies = {},
) {
  return async function GET(
    request: Request,
    context: { params: Promise<{ jobId: string }> | { jobId: string } },
  ) {
    let stage = "authenticate";
    try {
      const authenticatedUser = await (
        dependencies.resolveAuthenticatedUser ?? resolveAuthenticatedUser
      )(request);
      stage = "resolve-user";
      const repository =
        dependencies.repository ?? createDrizzleProfileRepository();
      const user = await repository.resolveUser(
        authenticatedUser.privyUserId,
      );
      const agentUrl = process.env.SHIRE_AGENT_INTERNAL_URL
        ?.trim()
        .replace(/\/+$/, "");
      const serviceToken = process.env.SHIRE_AGENT_SERVICE_TOKEN?.trim();
      if (!agentUrl || !serviceToken) {
        return NextResponse.json(
          { error: "missing-agent-configuration" },
          { status: 500 },
        );
      }
      stage = "resolve-job";
      const { jobId } = await context.params;
      const url = new URL(`${agentUrl}/jobs/${encodeURIComponent(jobId)}`);
      url.searchParams.set("candidateId", user.id);
      stage = "forward-agent";
      const upstream = await (dependencies.fetch ?? fetch)(url, {
        headers: { authorization: `Bearer ${serviceToken}` },
      });
      let payload: unknown;
      try {
        payload = await upstream.json();
      } catch {
        return NextResponse.json(
          { error: "invalid-agent-response" },
          { status: 502 },
        );
      }
      const parsed = upstreamCvJobSchema.safeParse(payload);
      if (!upstream.ok || !parsed.success) {
        return NextResponse.json(
          { error: "invalid-agent-response" },
          { status: upstream.ok ? 502 : upstream.status },
        );
      }
      return NextResponse.json(publicCvJob(parsed.data));
    } catch (error) {
      if (error instanceof AuthenticatedUserConfigurationError) {
        return NextResponse.json(
          { error: "authentication-configuration-error" },
          { status: 500 },
        );
      }
      if (error instanceof AuthenticatedUserError) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      if (error instanceof DatabaseConfigurationError) {
        return NextResponse.json(
          { error: "missing-database-configuration" },
          { status: 500 },
        );
      }
      if (error instanceof ProfileRepositoryError) {
        return NextResponse.json({ error: "database-error" }, { status: 500 });
      }
      console.error("[shire-web:cv-status-proxy] request failed", {
        stage,
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json({ error: "agent-unreachable" }, { status: 502 });
    }
  };
}

export const GET = createCandidateCvJobGetHandler();
