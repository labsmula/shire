import assert from "node:assert/strict";
import test from "node:test";

import { normalizeModelUsage } from "../src/runtime/usage";

test("normalizes provider usage into an AgentRun-compatible record", () => {
  assert.deepEqual(
    normalizeModelUsage({
      runId: "run-1",
      workload: "cv-normalization",
      tier: "cheap",
      model: "openrouter/qwen",
      usage: {
        inputTokens: 120,
        outputTokens: 40,
        totalTokens: 160,
      },
      latencyMs: 300,
      retryCount: 0,
    }),
    {
      runId: "run-1",
      workload: "cv-normalization",
      tier: "cheap",
      provider: "openrouter",
      model: "openrouter/qwen",
      inputTokens: 120,
      outputTokens: 40,
      totalTokens: 160,
      latencyMs: 300,
      retryCount: 0,
    },
  );
});
