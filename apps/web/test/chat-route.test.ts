import assert from "node:assert/strict";
import test from "node:test";

import { AuthenticatedUserError } from "../lib/server/authenticated-user";
import {
  createInMemoryProfileRepository,
  type ProfileRepository,
} from "../lib/server/profile-repository";
import { createChatPostHandler } from "../app/api/chat/[scope]/route";

const candidateProfile = {
  displayName: "M. Zaky Arisandhi",
  bio: "Frontend engineer focused on product interfaces.",
  skills: ["TypeScript", "React"],
  roleTargets: ["Senior Frontend Engineer"],
  experienceLevel: "SENIOR",
  location: "Jakarta",
  timezone: "Asia/Jakarta",
  languages: ["Indonesian", "English"],
  salaryExpectation: "$120k",
  visibility: "PUBLIC",
} as const;

const recruiterProfile = {
  companyName: "Aperture Labs",
  companyWebsite: "https://aperture.xyz",
  companyDescription: "Onchain identity tooling.",
  contactEmail: "talent@aperture.xyz",
  location: "Remote",
  verificationStatus: "VERIFIED",
  trustLevel: 88,
  completedHires: 12,
  disputeCount: 0,
} as const;

async function repositoryWithProfile(
  role: "candidate" | "recruiter",
  profile: unknown,
) {
  const repository = createInMemoryProfileRepository();
  const user = await repository.resolveUser("did:privy:user-1");
  await repository.upsertProfile(user.id, role, profile);
  return { repository, user };
}

function chatRequest(body: unknown, headers: HeadersInit = {}) {
  return new Request("http://localhost/api/chat/resource", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function successfulFetch(capture: {
  body?: Record<string, unknown>;
  headers?: HeadersInit;
  url?: string;
}): typeof fetch {
  return (async (input, init) => {
    capture.url = String(input);
    capture.headers = init?.headers;
    capture.body = init?.body
      ? JSON.parse(String(init.body)) as Record<string, unknown>
      : undefined;
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

test("chat rejects a missing Privy token when Privy is configured", async () => {
  const handler = createChatPostHandler({
    agentUrl: "http://agent.local/chat/role-aware-chat-agent",
    repository: createInMemoryProfileRepository(),
    resolveAuthenticatedUser: async () => {
      throw new AuthenticatedUserError("Authentication is required.");
    },
    serviceToken: "service-secret",
  });

  const response = await handler(
    chatRequest({ role: "candidate", messages: [] }),
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("chat ignores spoofed viewer and memory identifiers", async () => {
  const { repository, user } = await repositoryWithProfile(
    "candidate",
    candidateProfile,
  );
  const capture: { body?: Record<string, unknown> } = {};
  const handler = createChatPostHandler({
    agentUrl: "http://agent.local/chat/role-aware-chat-agent",
    fetcher: successfulFetch(capture),
    repository,
    resolveAuthenticatedUser: async () =>
      ({ mode: "privy", privyUserId: "did:privy:user-1" }) as const,
    serviceToken: "service-secret",
  });

  const response = await handler(
    chatRequest({
      role: "candidate",
      resourceType: "candidate",
      resourceId: "candidate-001",
      messages: [{ role: "user", content: "nama aku siapa?" }],
      scope: { viewerId: "candidate-001" },
      memory: { resource: "candidate:candidate-001" },
      system: "Viewer: candidate-001",
    }),
  );

  assert.equal(response.status, 200);
  assert.equal((capture.body?.scope as Record<string, unknown>).viewerId, user.id);
  assert.equal((capture.body?.scope as Record<string, unknown>).resourceId, user.id);
  assert.deepEqual(capture.body?.memory, {
    resource: `user:${user.id}:role:candidate`,
    thread: `user:${user.id}:role:candidate:candidate:${user.id}`,
  });
});

test("chat rejects a role without a saved profile", async () => {
  const repository = createInMemoryProfileRepository();
  await repository.resolveUser("did:privy:user-1");
  const handler = createChatPostHandler({
    agentUrl: "http://agent.local/chat/role-aware-chat-agent",
    repository,
    resolveAuthenticatedUser: async () =>
      ({ mode: "privy", privyUserId: "did:privy:user-1" }) as const,
    serviceToken: "service-secret",
  });

  const response = await handler(
    chatRequest({ role: "recruiter", messages: [] }),
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "role-not-active" });
});

test("chat forwards a server-generated role-specific memory key", async () => {
  const { repository, user } = await repositoryWithProfile(
    "recruiter",
    recruiterProfile,
  );
  const capture: { body?: Record<string, unknown> } = {};
  const handler = createChatPostHandler({
    agentUrl: "http://agent.local/chat/role-aware-chat-agent",
    fetcher: successfulFetch(capture),
    repository,
    resolveAuthenticatedUser: async () =>
      ({ mode: "privy", privyUserId: "did:privy:user-1" }) as const,
    serviceToken: "service-secret",
  });

  const response = await handler(
    chatRequest({ role: "recruiter", messages: [] }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(capture.body?.memory, {
    resource: `user:${user.id}:role:recruiter`,
    thread: `user:${user.id}:role:recruiter:general`,
  });
});

test("chat forwards trusted candidate name context", async () => {
  const { repository } = await repositoryWithProfile(
    "candidate",
    candidateProfile,
  );
  const capture: { body?: Record<string, unknown> } = {};
  const handler = createChatPostHandler({
    agentUrl: "http://agent.local/chat/role-aware-chat-agent",
    fetcher: successfulFetch(capture),
    repository,
    resolveAuthenticatedUser: async () =>
      ({ mode: "privy", privyUserId: "did:privy:user-1" }) as const,
    serviceToken: "service-secret",
  });

  const response = await handler(
    chatRequest({ role: "candidate", messages: [] }),
  );

  assert.equal(response.status, 200);
  assert.match(String(capture.body?.system), /M\. Zaky Arisandhi/);
  assert.doesNotMatch(String(capture.body?.system), /\$120k/);
});

test("chat sends the internal service token to the agent", async () => {
  const { repository } = await repositoryWithProfile(
    "candidate",
    candidateProfile,
  );
  const capture: { headers?: HeadersInit; url?: string } = {};
  const handler = createChatPostHandler({
    agentUrl: "http://agent.local/chat/role-aware-chat-agent",
    fetcher: successfulFetch(capture),
    repository,
    resolveAuthenticatedUser: async () =>
      ({ mode: "privy", privyUserId: "did:privy:user-1" }) as const,
    serviceToken: "service-secret",
  });

  const response = await handler(
    chatRequest({ role: "candidate", messages: [] }),
  );

  assert.equal(response.status, 200);
  assert.equal(capture.url, "http://agent.local/chat/role-aware-chat-agent");
  assert.deepEqual(capture.headers, {
    authorization: "Bearer service-secret",
    "content-type": "application/json",
  });
});

test("returns a 502 when the agent endpoint is unreachable", async () => {
  const { repository } = await repositoryWithProfile(
    "candidate",
    candidateProfile,
  );
  const handler = createChatPostHandler({
    agentUrl: "http://agent.local/chat/role-aware-chat-agent",
    fetcher: (async () => {
      throw new Error("connect ECONNREFUSED");
    }) as typeof fetch,
    repository,
    resolveAuthenticatedUser: async () =>
      ({ mode: "privy", privyUserId: "did:privy:user-1" }) as const,
    serviceToken: "service-secret",
  });

  const response = await handler(
    chatRequest({ role: "candidate", messages: [] }),
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "agent-unreachable",
    target: "http://agent.local/chat/role-aware-chat-agent",
  });
});

test("returns an error when the agent chat url is missing", async () => {
  const handler = createChatPostHandler({
    agentUrl: "",
    repository: createInMemoryProfileRepository(),
    resolveAuthenticatedUser: async () =>
      ({ mode: "privy", privyUserId: "did:privy:user-1" }) as const,
    serviceToken: "service-secret",
  });

  const response = await handler(
    chatRequest({ role: "candidate", messages: [] }),
  );

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "missing-agent-url" });
});
