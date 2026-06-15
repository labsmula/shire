import assert from "node:assert/strict";
import test from "node:test";

import { resolveCandidateIdentity } from "../lib/server/candidate-identity";
import { POST } from "../app/api/candidates/me/cv/route";
import { GET } from "../app/api/candidates/me/cv/jobs/[jobId]/route";

test("uses demo identity when Privy server auth is not configured", async () => {
  assert.equal(
    await resolveCandidateIdentity(new Request("http://localhost"), {
      appId: undefined,
      appSecret: undefined,
      nodeEnv: "development",
      verifyAccessToken: async () => ({ userId: "unused" }),
    }),
    "demo-user",
  );
});

test("CV upload maps Privy configuration failures to a stable 500", async () => {
  await withEnvironment(
    {
      NODE_ENV: "production",
      NEXT_PUBLIC_PRIVY_APP_ID: undefined,
      PRIVY_APP_SECRET: undefined,
      SHIRE_AGENT_INTERNAL_URL: "http://agent.local",
      SHIRE_AGENT_SERVICE_TOKEN: "service-secret",
    },
    async () => {
      const response = await POST(
        new Request("http://localhost/api/candidates/me/cv", {
          method: "POST",
          body: new FormData(),
        }),
      );

      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), {
        error: "authentication-configuration-error",
      });
    },
  );
});

test("CV status maps partial Privy configuration to a stable 500", async () => {
  await withEnvironment(
    {
      NODE_ENV: "development",
      NEXT_PUBLIC_PRIVY_APP_ID: "app-id",
      PRIVY_APP_SECRET: undefined,
      SHIRE_AGENT_INTERNAL_URL: "http://agent.local",
      SHIRE_AGENT_SERVICE_TOKEN: "service-secret",
    },
    async () => {
      const response = await GET(
        new Request("http://localhost/api/candidates/me/cv/jobs/job-1"),
        { params: Promise.resolve({ jobId: "job-1" }) },
      );

      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), {
        error: "authentication-configuration-error",
      });
    },
  );
});

test("CV upload maps a missing token to 401", async () => {
  await withEnvironment(
    {
      NODE_ENV: "production",
      NEXT_PUBLIC_PRIVY_APP_ID: "app-id",
      PRIVY_APP_SECRET: "secret",
      SHIRE_AGENT_INTERNAL_URL: "http://agent.local",
      SHIRE_AGENT_SERVICE_TOKEN: "service-secret",
    },
    async () => {
      const response = await POST(
        new Request("http://localhost/api/candidates/me/cv", {
          method: "POST",
          body: new FormData(),
        }),
      );

      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { error: "unauthorized" });
    },
  );
});

test("forwards a CV using the server-resolved candidate identity", async () => {
  const previousUrl = process.env.SHIRE_AGENT_INTERNAL_URL;
  const previousToken = process.env.SHIRE_AGENT_SERVICE_TOKEN;
  process.env.SHIRE_AGENT_INTERNAL_URL = "http://agent.local";
  process.env.SHIRE_AGENT_SERVICE_TOKEN = "service-secret";
  const originalFetch = globalThis.fetch;
  let forwardedCandidateId: FormDataEntryValue | null = null;
  let forwardedAuthorization: string | null = null;

  globalThis.fetch = (async (_input, init) => {
    const form = init?.body as FormData;
    forwardedCandidateId = form.get("candidateId");
    forwardedAuthorization = new Headers(init?.headers).get("authorization");
    return Response.json({ jobId: "job-1", status: "queued" }, { status: 202 });
  }) as typeof fetch;

  try {
    const form = new FormData();
    form.set("candidateId", "attacker-controlled");
    form.set(
      "file",
      new Blob(["%PDF-1.7"], { type: "application/pdf" }),
      "cv.pdf",
    );
    const response = await POST(
      new Request("http://localhost/api/candidates/me/cv", {
        method: "POST",
        body: form,
      }),
    );

    assert.equal(response.status, 202);
    assert.equal(forwardedCandidateId, "demo-user");
    assert.equal(forwardedAuthorization, "Bearer service-secret");
  } finally {
    globalThis.fetch = originalFetch;
    restore("SHIRE_AGENT_INTERNAL_URL", previousUrl);
    restore("SHIRE_AGENT_SERVICE_TOKEN", previousToken);
  }
});

test("polls status with the server-resolved candidate identity", async () => {
  const previousUrl = process.env.SHIRE_AGENT_INTERNAL_URL;
  const previousToken = process.env.SHIRE_AGENT_SERVICE_TOKEN;
  process.env.SHIRE_AGENT_INTERNAL_URL = "http://agent.local/";
  process.env.SHIRE_AGENT_SERVICE_TOKEN = "service-secret";
  const originalFetch = globalThis.fetch;
  let forwardedUrl = "";

  globalThis.fetch = (async (input) => {
    forwardedUrl = String(input);
    return Response.json({ id: "job-1", status: "completed" });
  }) as typeof fetch;

  try {
    const response = await GET(
      new Request("http://localhost/api/candidates/me/cv/jobs/job-1"),
      { params: Promise.resolve({ jobId: "job-1" }) },
    );
    assert.equal(response.status, 200);
    assert.equal(
      forwardedUrl,
      "http://agent.local/jobs/job-1?candidateId=demo-user",
    );
  } finally {
    globalThis.fetch = originalFetch;
    restore("SHIRE_AGENT_INTERNAL_URL", previousUrl);
    restore("SHIRE_AGENT_SERVICE_TOKEN", previousToken);
  }
});

function restore(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

async function withEnvironment(
  values: Record<string, string | undefined>,
  operation: () => Promise<void>,
) {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  for (const [key, value] of Object.entries(values)) {
    restore(key, value);
  }
  try {
    await operation();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      restore(key, value);
    }
  }
}
