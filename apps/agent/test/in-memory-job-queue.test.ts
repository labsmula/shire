import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryJobQueue } from "../src/runtime/jobs/in-memory-job-queue";

test("enqueues and reserves jobs in FIFO order", async () => {
  const queue = new InMemoryJobQueue();
  const first = await queue.enqueue({
    name: "onchain-sync",
    payload: { chain: "Celo" },
  });
  const second = await queue.enqueue({
    name: "cv-parse",
    payload: { candidateId: "candidate-001", rawCv: "CV" },
  });

  assert.equal((await queue.reserve())?.id, first.id);
  assert.equal((await queue.reserve())?.id, second.id);
});

test("tracks completed results", async () => {
  const queue = new InMemoryJobQueue();
  const job = await queue.enqueue({
    name: "onchain-sync",
    payload: { chain: "Celo" },
  });

  await queue.markActive(job.id);
  await queue.markCompleted(job.id, {
    status: "ready",
    chain: "Celo",
    llmInvoked: false,
  });

  const completed = await queue.get(job.id);
  assert.equal(completed?.status, "completed");
  assert.deepEqual(completed?.result, {
    status: "ready",
    chain: "Celo",
    llmInvoked: false,
  });
});
