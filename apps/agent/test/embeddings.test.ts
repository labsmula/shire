import assert from "node:assert/strict";
import test from "node:test";

process.env.OPENROUTER_API_KEY ??= "test-openrouter-api-key";

const { createEmbeddingModel } = await import("../src/runtime/embeddings");

test("disables known AI SDK compatibility warning logs", () => {
  assert.equal(
    (globalThis as { AI_SDK_LOG_WARNINGS?: boolean }).AI_SDK_LOG_WARNINGS,
    false,
  );
});

test("creates Qwen embeddings through OpenRouter", () => {
  const model = createEmbeddingModel({
    modelId: "qwen/qwen3-embedding-8b",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: "test-openrouter-api-key",
  });

  assert.equal(model.provider, "openrouter");
  assert.equal(model.modelId, "qwen/qwen3-embedding-8b");
  assert.equal(typeof model.doEmbed, "function");
});
