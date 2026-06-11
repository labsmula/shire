import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "../app/api/chat/[scope]/route";

test("returns an error when the agent chat url is missing", async () => {
  const previousUrl = process.env.SHIRE_AGENT_CHAT_URL;
  delete process.env.SHIRE_AGENT_CHAT_URL;

  try {
    const response = await POST(
      new Request("http://localhost/api/chat/resource", {
        method: "POST",
        body: JSON.stringify({
          scope: {
            viewerId: "me_candidate",
            role: "candidate",
            resourceType: "job",
            resourceId: "job_fe_aperture",
            threadId: "candidate:me_candidate:job:job_fe_aperture",
            resourceKey: "candidate:me_candidate:job:job_fe_aperture",
            scope: "resource",
          },
          messages: [],
          memory: {
            thread: "candidate:me_candidate:job:job_fe_aperture",
            resource: "candidate:me_candidate:job:job_fe_aperture",
          },
          system: "Viewer: me_candidate\nRole: candidate",
        }),
      }),
    );

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: "missing-agent-url" });
  } finally {
    if (previousUrl) {
      process.env.SHIRE_AGENT_CHAT_URL = previousUrl;
    }
  }
});

test("forwards chat payload to the agent endpoint", async () => {
  const previousUrl = process.env.SHIRE_AGENT_CHAT_URL;
  process.env.SHIRE_AGENT_CHAT_URL =
    "http://agent.local/chat/role-aware-chat-agent";

  const originalFetch = globalThis.fetch;
  let forwardedBody: unknown = null;
  let forwardedUrl: string | null = null;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    forwardedUrl = String(input);
    forwardedBody = init?.body ? JSON.parse(String(init.body)) : null;

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const response = await POST(
      new Request("http://localhost/api/chat/resource", {
        method: "POST",
        body: JSON.stringify({
          scope: {
            viewerId: "me_candidate",
            role: "candidate",
            resourceType: "job",
            resourceId: "job_fe_aperture",
            threadId: "candidate:me_candidate:job:job_fe_aperture",
            resourceKey: "candidate:me_candidate:job:job_fe_aperture",
            scope: "resource",
            resourceLabel: "Senior Frontend Engineer",
          },
          messages: [{ role: "user", content: "What should I ask about this role?" }],
          memory: {
            thread: "candidate:me_candidate:job:job_fe_aperture",
            resource: "candidate:me_candidate:job:job_fe_aperture",
          },
          system: "Viewer: me_candidate\nRole: candidate",
        }),
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(forwardedUrl, "http://agent.local/chat/role-aware-chat-agent");
    assert.ok(forwardedBody);
    assert.deepEqual((forwardedBody as Record<string, unknown>).scope, {
      viewerId: "me_candidate",
      role: "candidate",
      resourceType: "job",
      resourceId: "job_fe_aperture",
      threadId: "candidate:me_candidate:job:job_fe_aperture",
      resourceKey: "candidate:me_candidate:job:job_fe_aperture",
      scope: "resource",
      resourceLabel: "Senior Frontend Engineer",
    });
    assert.deepEqual((forwardedBody as Record<string, unknown>).memory, {
      thread: "candidate:me_candidate:job:job_fe_aperture",
      resource: "candidate:me_candidate:job:job_fe_aperture",
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (previousUrl) {
      process.env.SHIRE_AGENT_CHAT_URL = previousUrl;
    } else {
      delete process.env.SHIRE_AGENT_CHAT_URL;
    }
  }
});

test("returns a 502 when the agent endpoint is unreachable", async () => {
  const previousUrl = process.env.SHIRE_AGENT_CHAT_URL;
  process.env.SHIRE_AGENT_CHAT_URL =
    "http://agent.local/chat/role-aware-chat-agent";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error("connect ECONNREFUSED");
  }) as typeof fetch;

  try {
    const response = await POST(
      new Request("http://localhost/api/chat/resource", {
        method: "POST",
        body: JSON.stringify({
          scope: {
            viewerId: "me_candidate",
            role: "candidate",
            resourceType: "job",
            resourceId: "job_fe_aperture",
            threadId: "candidate:me_candidate:job:job_fe_aperture",
            resourceKey: "candidate:me_candidate:job:job_fe_aperture",
            scope: "resource",
            resourceLabel: "Senior Frontend Engineer",
          },
          messages: [],
        }),
      }),
    );

    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), {
      error: "agent-unreachable",
      target: "http://agent.local/chat/role-aware-chat-agent",
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (previousUrl) {
      process.env.SHIRE_AGENT_CHAT_URL = previousUrl;
    } else {
      delete process.env.SHIRE_AGENT_CHAT_URL;
    }
  }
});
