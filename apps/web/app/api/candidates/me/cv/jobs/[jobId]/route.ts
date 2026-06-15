import { NextResponse } from "next/server";

import {
  CandidateAuthenticationError,
  resolveCandidateIdentity,
} from "@/lib/server/candidate-identity";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> | { jobId: string } },
) {
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

  let stage = "authenticate";
  try {
    const candidateId = await resolveCandidateIdentity(request);
    stage = "resolve-job";
    const { jobId } = await context.params;
    const url = new URL(`${agentUrl}/jobs/${encodeURIComponent(jobId)}`);
    url.searchParams.set("candidateId", candidateId);
    stage = "forward-agent";
    const upstream = await fetch(url, {
      headers: { authorization: `Bearer ${serviceToken}` },
    });
    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    if (error instanceof CandidateAuthenticationError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[shire-web:cv-status-proxy] request failed", {
      stage,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "agent-unreachable" }, { status: 502 });
  }
}
