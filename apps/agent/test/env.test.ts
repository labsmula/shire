import assert from "node:assert/strict";
import test from "node:test";

import { createEnv } from "../src/env";

test("defaults autonomy mode to semi-autonomous", () => {
  const env = createEnv({});

  assert.equal(env.autonomyMode, "semi-autonomous");
  assert.equal(env.logLevel, "debug");
  assert.equal(env.prettyLogs, true);
  assert.equal("openAiApiKey" in env, false);
  assert.equal("openRouterApiKey" in env, false);
  assert.equal("tokenRouterApiKey" in env, false);
});

test("defaults cost-aware model, memory, and knowledge config", () => {
  const env = createEnv({});

  assert.deepEqual(env.modelChains.cheap, [
    "openrouter/nex-agi/nex-n2-pro:free",
    "openrouter/openai/gpt-oss-20b:free",
  ]);
  assert.deepEqual(env.modelChains.heavy, [
    "openrouter/openai/gpt-oss-20b:free",
    "openrouter/nex-agi/nex-n2-pro:free",
  ]);
  assert.equal(env.embeddingModel, "qwen/qwen3-embedding-8b");
  assert.equal(env.embeddingBaseUrl, "https://openrouter.ai/api/v1");
  assert.equal(env.embeddingEnabled, true);
  assert.equal(env.workingMemoryEnabled, false);
  assert.equal(env.agentMemoryUrl, "file:./.data/shire-agent-memory.db");
  assert.equal(env.agentKnowledgeUrl, "file:./.data/shire-agent-knowledge.db");
  assert.equal(env.agentKnowledgeIndex, "shire_context");
  assert.equal(env.ragTopK, 5);
  assert.equal(env.ragMaxCharacters, 8_000);
  assert.equal(env.workerEnabled, true);
  assert.equal(env.liveLlmTestsEnabled, false);
});

test("defaults bounded chat security config", () => {
  const env = createEnv({});

  assert.equal(env.chatMaxBodyBytes, 65_536);
  assert.equal(env.chatMaxMessages, 50);
  assert.equal(env.chatMaxMessageCharacters, 8_000);
  assert.equal(env.chatRateLimitRequests, 30);
  assert.equal(env.chatRateLimitWindowSeconds, 60);
  assert.equal(env.securityGuardEnabled, true);
  assert.equal(env.securityGuardMode, "suspicious-only");
  assert.deepEqual(env.securityGuardModels, [
    "openrouter/nex-agi/nex-n2-pro:free",
    "openrouter/openai/gpt-oss-20b:free",
  ]);
  assert.equal(env.securityGuardThreshold, 0.85);
  assert.equal(env.outputMaxCharacters, 12_000);
});

test("accepts comma-separated model chain overrides", () => {
  const env = createEnv({
    SHIRE_MODEL_CHEAP:
      "openrouter/qwen/qwen3-4b:free,openrouter/free",
  });

  assert.deepEqual(env.modelChains.cheap, [
    "openrouter/qwen/qwen3-4b:free",
    "openrouter/free",
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
    SHIRE_EMBEDDING_ENABLED: "true",
    SHIRE_WORKING_MEMORY_ENABLED: "true",
    SHIRE_EMBEDDING_BASE_URL: "https://embedding.example/v1/",
    SHIRE_WORKER_ENABLED: "false",
    SHIRE_LIVE_LLM_TESTS: "true",
  });

  assert.equal(env.logLevel, "warn");
  assert.equal(env.prettyLogs, false);
  assert.deepEqual(env.modelChains.heavy, ["openai/gpt-5.1"]);
  assert.equal(env.embeddingEnabled, true);
  assert.equal(env.workingMemoryEnabled, true);
  assert.equal(env.embeddingBaseUrl, "https://embedding.example/v1");
  assert.equal(env.workerEnabled, false);
  assert.equal(env.liveLlmTestsEnabled, true);
});

test("rejects invalid positive integer config", () => {
  assert.throws(() => createEnv({ SHIRE_RAG_TOP_K: "0" }));
});

test("rejects invalid security threshold and guard mode config", () => {
  assert.throws(() => createEnv({ SHIRE_SECURITY_GUARD_THRESHOLD: "-0.01" }));
  assert.throws(() => createEnv({ SHIRE_SECURITY_GUARD_THRESHOLD: "1.01" }));
  assert.throws(() => createEnv({ SHIRE_SECURITY_GUARD_MODE: "wide-open" }));
});
