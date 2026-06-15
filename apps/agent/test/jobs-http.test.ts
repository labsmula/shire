import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";

import { createRuntimeHttpServer } from "../src/server";
import { InMemoryJobQueue } from "../src/runtime/jobs/in-memory-job-queue";

test("enqueues and polls a deterministic worker job", async () => {
  const queue = new InMemoryJobQueue();
  const server = await createRuntimeHttpServer({
    jobQueue: queue,
    processJob: async () => ({
      status: "ready",
      chain: "Celo",
      llmInvoked: false,
    }),
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));

  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const enqueueResponse = await fetch(`${baseUrl}/jobs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "onchain-sync",
        payload: { chain: "Celo" },
      }),
    });
    const accepted = (await enqueueResponse.json()) as {
      jobId: string;
      status: string;
    };

    assert.equal(enqueueResponse.status, 202);
    assert.equal(accepted.status, "queued");

    let job: any;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const response = await fetch(`${baseUrl}/jobs/${accepted.jobId}`);
      job = await response.json();
      if (job.status === "completed") {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    assert.equal(job.status, "completed");
    assert.equal(job.result.llmInvoked, false);
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("rejects invalid job payloads", async () => {
  const server = await createRuntimeHttpServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));

  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const response = await fetch(
      `http://127.0.0.1:${address.port}/jobs`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "cv-parse",
          payload: { candidateId: "candidate-001", rawCv: "" },
        }),
      },
    );

    assert.equal(response.status, 400);
  } finally {
    server.close();
    await once(server, "close");
  }
});
