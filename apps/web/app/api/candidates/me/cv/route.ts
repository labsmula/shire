import { NextResponse } from "next/server";

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

function agentConfig() {
  const url = process.env.SHIRE_AGENT_INTERNAL_URL?.trim().replace(/\/+$/, "");
  const token = process.env.SHIRE_AGENT_SERVICE_TOKEN?.trim();
  return url && token ? { url, token } : undefined;
}

type CandidateCvRouteDependencies = {
  resolveAuthenticatedUser?: (request: Request) => Promise<AuthenticatedUser>;
  repository?: ProfileRepository;
  fetch?: typeof fetch;
};

export function createCandidateCvPostHandler(
  dependencies: CandidateCvRouteDependencies = {},
) {
  return async function POST(request: Request) {
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
      const config = agentConfig();
      if (!config) {
        return NextResponse.json(
          { error: "missing-agent-configuration" },
          { status: 500 },
        );
      }
      stage = "parse-form";
      let incoming: FormData;
      try {
        incoming = await request.formData();
      } catch {
        return NextResponse.json(
          { error: "invalid-multipart" },
          { status: 400 },
        );
      }
      const file = incoming.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "cv-file-required" },
          { status: 400 },
        );
      }

      const upstreamBody = new FormData();
      upstreamBody.set("candidateId", user.id);
      upstreamBody.set("file", file, file.name);
      stage = "forward-agent";
      const upstream = await (dependencies.fetch ?? fetch)(
        `${config.url}/jobs/cv-document`,
        {
          method: "POST",
          headers: { authorization: `Bearer ${config.token}` },
          body: upstreamBody,
        },
      );
      return new Response(await upstream.arrayBuffer(), {
        status: upstream.status,
        headers: {
          "content-type":
            upstream.headers.get("content-type") ?? "application/json",
        },
      });
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
      console.error("[shire-web:cv-proxy] request failed", {
        stage,
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json({ error: "agent-unreachable" }, { status: 502 });
    }
  };
}

export const POST = createCandidateCvPostHandler();
