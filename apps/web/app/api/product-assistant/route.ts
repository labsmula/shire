import { NextResponse } from "next/server";

export const runtime = "nodejs";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function resolveProductQnaUrl() {
  const internalUrl = process.env.SHIRE_AGENT_INTERNAL_URL?.trim();
  if (internalUrl) {
    return `${internalUrl.replace(/\/+$/, "")}/product-qna`;
  }

  const chatUrl = process.env.SHIRE_AGENT_CHAT_URL?.trim();
  if (!chatUrl) {
    return undefined;
  }

  return chatUrl.replace(/\/chat\/[^/]+\/?$/, "/product-qna");
}

export async function POST(request: Request) {
  const agentUrl = resolveProductQnaUrl();
  const serviceToken = process.env.SHIRE_AGENT_SERVICE_TOKEN?.trim();

  if (!agentUrl) {
    console.error("[shire-web:product-assistant] missing agent URL");
    return jsonError("missing-agent-url", 500);
  }

  if (!serviceToken) {
    console.error("[shire-web:product-assistant] missing service token");
    return jsonError("missing-service-token", 500);
  }

  const body = await request.json().catch(() => undefined);
  const question =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>).question
      : undefined;

  if (typeof question !== "string" || question.trim().length === 0) {
    return jsonError("invalid-product-question", 400);
  }

  let upstream: Response;
  try {
    upstream = await fetch(agentUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${serviceToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ question }),
    });
  } catch {
    return jsonError("agent-unreachable", 502);
  }

  const responseBody = await upstream.text();
  return new Response(responseBody, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
