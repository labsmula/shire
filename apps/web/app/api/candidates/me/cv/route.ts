import { NextResponse } from "next/server";

import {
  CandidateAuthenticationError,
  resolveCandidateIdentity,
} from "@/lib/server/candidate-identity";

export const runtime = "nodejs";

function agentConfig() {
  const url = process.env.SHIRE_AGENT_INTERNAL_URL?.trim().replace(/\/+$/, "");
  const token = process.env.SHIRE_AGENT_SERVICE_TOKEN?.trim();
  return url && token ? { url, token } : undefined;
}

export async function POST(request: Request) {
  const config = agentConfig();
  if (!config) {
    return NextResponse.json(
      { error: "missing-agent-configuration" },
      { status: 500 },
    );
  }

  let stage = "authenticate";
  try {
    const candidateId = await resolveCandidateIdentity(request);
    stage = "parse-form";
    const incoming = await request.formData();
    const file = incoming.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "cv-file-required" }, { status: 400 });
    }

    const upstreamBody = new FormData();
    upstreamBody.set("candidateId", candidateId);
    upstreamBody.set("file", file, file.name);
    stage = "forward-agent";
    const upstream = await fetch(`${config.url}/jobs/cv-document`, {
      method: "POST",
      headers: { authorization: `Bearer ${config.token}` },
      body: upstreamBody,
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
    console.error("[shire-web:cv-proxy] request failed", {
      stage,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "agent-unreachable" }, { status: 502 });
  }
}
