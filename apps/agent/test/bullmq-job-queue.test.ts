import assert from "node:assert/strict";
import test from "node:test";

import {
  createBullJobOptions,
  mapBullJobEnvelope,
} from "../src/runtime/jobs/bullmq-job-queue";

test("uses three attempts with exponential delayed retry", () => {
  assert.deepEqual(createBullJobOptions({ attempts: 3, backoffMs: 5_000 }), {
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: false,
    removeOnFail: false,
  });
});

test("maps delayed BullMQ jobs with ownership and retry metadata", async () => {
  const envelope = await mapBullJobEnvelope(
    {
      id: "job-1",
      name: "cv-parse",
      data: {
        name: "cv-parse",
        payload: { candidateId: "candidate-1", rawCv: "CV" },
      },
      attemptsMade: 1,
      opts: { attempts: 3, delay: 5_000 },
      delay: 5_000,
      timestamp: 1_000,
      processedOn: 2_000,
      returnvalue: null,
      failedReason: undefined,
      getState: async () => "delayed",
    },
    "candidate-1",
  );

  assert.equal(envelope?.status, "delayed");
  assert.equal(envelope?.attempts, 1);
  assert.equal(envelope?.maxAttempts, 3);
  assert.equal(envelope?.nextRetryAt, new Date(7_000).toISOString());
  assert.equal(
    await mapBullJobEnvelope(
      {
        id: "job-1",
        name: "cv-parse",
        data: {
          name: "cv-parse",
          payload: { candidateId: "candidate-1", rawCv: "CV" },
        },
        attemptsMade: 0,
        opts: {},
        timestamp: 1,
        returnvalue: null,
        getState: async () => "waiting",
      },
      "candidate-2",
    ),
    undefined,
  );
});
