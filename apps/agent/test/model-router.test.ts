import assert from "node:assert/strict";
import test from "node:test";

import {
  getWorkloadPolicy,
  shouldEscalate,
} from "../src/runtime/model-policy";
import {
  createModelFallbackChain,
  resolveRuntimeAgentModelId,
} from "../src/runtime/model-router";

test("routes routine CV normalization to the cheap tier", () => {
  assert.equal(getWorkloadPolicy("cv-normalization").tier, "cheap");
});

test("routes dispute summaries directly to the heavy tier", () => {
  assert.equal(getWorkloadPolicy("dispute-summary").tier, "heavy");
});

test("escalates invalid CV output only after two schema failures", () => {
  assert.equal(
    shouldEscalate({
      workload: "cv-normalization",
      schemaFailureCount: 1,
      confidence: 0.4,
    }),
    false,
  );
  assert.equal(
    shouldEscalate({
      workload: "cv-normalization",
      schemaFailureCount: 2,
      confidence: 0.4,
    }),
    true,
  );
});

test("escalates a schema-valid CV profile with low confidence", () => {
  assert.equal(
    shouldEscalate({
      workload: "cv-normalization",
      schemaFailureCount: 0,
      confidence: 0.4,
    }),
    true,
  );
});

test("creates a Mastra fallback entry for each configured model", () => {
  assert.deepEqual(
    createModelFallbackChain(["openrouter/free", "zai/glm", "openai/mini"]),
    [
      { model: "openrouter/free", maxRetries: 1 },
      { model: "zai/glm", maxRetries: 1 },
      { model: "openai/mini", maxRetries: 1 },
    ],
  );
});

test("uses Z.ai as the default chat model when workload is missing", () => {
  const result = resolveRuntimeAgentModelId();

  assert.equal(result, "zai/zai/glm-4.5-air");
});
