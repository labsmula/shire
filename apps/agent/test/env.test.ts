import assert from "node:assert/strict";
import test from "node:test";

import { createEnv } from "../src/env";

test("defaults autonomy mode to semi-autonomous", () => {
  const env = createEnv({});

  assert.equal(env.autonomyMode, "semi-autonomous");
  assert.equal(env.logLevel, "debug");
  assert.equal(env.prettyLogs, true);
  assert.equal(env.openAiApiKey, undefined);
  assert.equal(env.zaiBaseUrl, "https://api.z.ai/api/coding/paas/v4");
});

test("defaults cost-aware model, memory, and knowledge config", () => {
  const env = createEnv({});

  assert.deepEqual(env.modelChains.cheap, [
    "openrouter/meta-llama/llama-3.3-70b-instruct:free",
    "zai/zai/glm-4.5-air",
    "openai/gpt-4.1-mini",
  ]);
  assert.deepEqual(env.modelChains.heavy, [
    "openai/gpt-5",
    "zai/zai/glm-4.5",
  ]);
  assert.equal(env.embeddingModel, "text-embedding-3-small");
  assert.equal(env.agentMemoryUrl, "file:./.data/shire-agent-memory.db");
  assert.equal(env.agentKnowledgeUrl, "file:./.data/shire-agent-knowledge.db");
  assert.equal(env.agentKnowledgeIndex, "shire-context");
  assert.equal(env.ragTopK, 5);
  assert.equal(env.ragMaxCharacters, 8_000);
});

test("accepts comma-separated model chain overrides", () => {
  const env = createEnv({
    SHIRE_MODEL_CHEAP:
      "openrouter/qwen/qwen3-4b:free,zai/zai/glm-4.5-air,openai/gpt-4.1-mini",
  });

  assert.deepEqual(env.modelChains.cheap, [
    "openrouter/qwen/qwen3-4b:free",
    "zai/zai/glm-4.5-air",
    "openai/gpt-4.1-mini",
  ]);
});

test("parses a valid autonomy mode from SHIRE_AUTONOMY_MODE", () => {
  const env = createEnv({ SHIRE_AUTONOMY_MODE: "fully-autonomous" });

  assert.equal(env.autonomyMode, "fully-autonomous");
});

test("rejects an invalid autonomy mode", () => {
  assert.throws(() => createEnv({ SHIRE_AUTONOMY_MODE: "wide-open" }));
});

test("parses custom agent config from environment variables", () => {
  const env = createEnv({
    NODE_ENV: "production",
    SHIRE_LOG_LEVEL: "warn",
    SHIRE_PRETTY_LOGS: "false",
    SHIRE_MODEL_HEAVY: "openai/gpt-5.1",
    OPENAI_API_KEY: "secret",
    OPENROUTER_API_KEY: "router-secret",
    ZAI_API_KEY: "zai-secret",
    ZAI_BASE_URL: "https://api.z.ai/api/coding/paas/v4",
  });

  assert.equal(env.logLevel, "warn");
  assert.equal(env.prettyLogs, false);
  assert.deepEqual(env.modelChains.heavy, ["openai/gpt-5.1"]);
  assert.equal(env.openAiApiKey, "secret");
  assert.equal(env.openRouterApiKey, "router-secret");
  assert.equal(env.zaiApiKey, "zai-secret");
  assert.equal(env.zaiBaseUrl, "https://api.z.ai/api/coding/paas/v4");
});

test("rejects invalid positive integer config", () => {
  assert.throws(() => createEnv({ SHIRE_RAG_TOP_K: "0" }));
});
