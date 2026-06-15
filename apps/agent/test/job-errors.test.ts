import assert from "node:assert/strict";
import test from "node:test";
import { ZodError } from "zod";

import { isRetryableJobError } from "../src/runtime/jobs/job-errors";

test("retries provider, timeout, and transient network failures", () => {
  assert.equal(isRetryableJobError({ statusCode: 502 }), true);
  assert.equal(isRetryableJobError({ status: 429 }), true);
  assert.equal(isRetryableJobError(new Error("request timed out")), true);
  assert.equal(isRetryableJobError(Object.assign(new Error("reset"), { code: "ECONNRESET" })), true);
});

test("follows wrapped causes and rejects permanent validation failures", () => {
  assert.equal(
    isRetryableJobError(new Error("normalization failed", {
      cause: { statusCode: 503 },
    })),
    true,
  );
  assert.equal(isRetryableJobError(new ZodError([])), false);
  assert.equal(isRetryableJobError(new Error("CV parse job aborted")), false);
});
