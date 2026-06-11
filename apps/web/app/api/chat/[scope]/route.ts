import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const agentUrl = process.env.SHIRE_AGENT_CHAT_URL?.trim();
  const startedAt = Date.now();

  if (!agentUrl) {
    console.error("[shire-web:chat-proxy] missing SHIRE_AGENT_CHAT_URL");
    return NextResponse.json({ error: "missing-agent-url" }, { status: 500 });
  }

  const body = await request.json();
  console.info("[shire-web:chat-proxy] forwarding request", {
    method: request.method,
    agentUrl,
  });

  try {
    const upstream = await fetch(agentUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!upstream.ok) {
      const errorBody = await upstream.text();
      console.error("[shire-web:chat-proxy] upstream error", {
        agentUrl,
        durationMs: Date.now() - startedAt,
        status: upstream.status,
        body: errorBody,
      });
      return new Response(errorBody, {
        status: upstream.status,
        headers: upstream.headers,
      });
    }

    console.info("[shire-web:chat-proxy] upstream success", {
      agentUrl,
      durationMs: Date.now() - startedAt,
      status: upstream.status,
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: upstream.headers,
    });
  } catch {
    console.error("[shire-web:chat-proxy] agent unreachable", {
      agentUrl,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      {
        error: "agent-unreachable",
        target: agentUrl,
      },
      { status: 502 },
    );
  }
}
