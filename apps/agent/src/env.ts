import { parseAutonomyMode } from "./runtime/autonomy";

function parseBoolean(value: string | undefined, defaultValue: boolean) {
  const normalized = value?.trim().toLowerCase();

  if (normalized === undefined || normalized === "") {
    return defaultValue;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`Unsupported boolean flag: ${value}`);
}

function parseModelChain(value: string | undefined, defaults: readonly string[]) {
  const models = value
    ?.split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  return models?.length ? models : [...defaults];
}

function parseUnitInterval(value: string | undefined, fallback: number) {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new Error(`Expected a unit interval between 0 and 1, received: ${value}`);
  }

  return parsed;
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received: ${value}`);
  }

  return parsed;
}

function parseSecurityGuardMode(value: string | undefined) {
  const normalized = value?.trim();

  if (normalized === undefined || normalized === "") {
    return "suspicious-only" as const;
  }

  if (normalized === "suspicious-only") {
    return normalized;
  }

  throw new Error(`Unsupported security guard mode: ${value}`);
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export function createEnv(input: NodeJS.ProcessEnv = process.env) {
  const nodeEnv = input.NODE_ENV ?? "development";

  return {
    nodeEnv,
    port: Number(input.PORT ?? 3010),
    autonomyMode: parseAutonomyMode(input.SHIRE_AUTONOMY_MODE),
    logLevel: input.SHIRE_LOG_LEVEL?.trim() || (nodeEnv === "development" ? "debug" : "info"),
    prettyLogs: parseBoolean(input.SHIRE_PRETTY_LOGS, nodeEnv !== "production"),
    modelChains: {
      cheap: parseModelChain(input.SHIRE_MODEL_CHEAP, [
        "openrouter/nex-agi/nex-n2-pro:free",
        "openrouter/openai/gpt-oss-20b:free",
      ]),
      balanced: parseModelChain(input.SHIRE_MODEL_BALANCED, [
        "openrouter/nex-agi/nex-n2-pro:free",
        "openrouter/openai/gpt-oss-20b:free",
      ]),
      heavy: parseModelChain(input.SHIRE_MODEL_HEAVY, [
        "openrouter/openai/gpt-oss-20b:free",
        "openrouter/nex-agi/nex-n2-pro:free",
      ]),
    },
    embeddingModel:
      input.SHIRE_EMBEDDING_MODEL?.trim() ||
      "qwen/qwen3-embedding-8b",
    embeddingEnabled: parseBoolean(input.SHIRE_EMBEDDING_ENABLED, true),
    workingMemoryEnabled: parseBoolean(
      input.SHIRE_WORKING_MEMORY_ENABLED,
      false,
    ),
    workerEnabled: parseBoolean(input.SHIRE_WORKER_ENABLED, true),
    liveLlmTestsEnabled: parseBoolean(
      input.SHIRE_LIVE_LLM_TESTS,
      false,
    ),
    chatMaxBodyBytes: parsePositiveInteger(input.SHIRE_CHAT_MAX_BODY_BYTES, 65_536),
    chatMaxMessages: parsePositiveInteger(input.SHIRE_CHAT_MAX_MESSAGES, 50),
    chatMaxMessageCharacters: parsePositiveInteger(
      input.SHIRE_CHAT_MAX_MESSAGE_CHARACTERS,
      8_000,
    ),
    chatRateLimitRequests: parsePositiveInteger(
      input.SHIRE_CHAT_RATE_LIMIT_REQUESTS,
      30,
    ),
    chatRateLimitWindowSeconds: parsePositiveInteger(
      input.SHIRE_CHAT_RATE_LIMIT_WINDOW_SECONDS,
      60,
    ),
    securityGuardEnabled: parseBoolean(input.SHIRE_SECURITY_GUARD_ENABLED, true),
    securityGuardMode: parseSecurityGuardMode(input.SHIRE_SECURITY_GUARD_MODE),
    securityGuardModels: parseModelChain(input.SHIRE_SECURITY_GUARD_MODELS, [
      "openrouter/nex-agi/nex-n2-pro:free",
      "openrouter/openai/gpt-oss-20b:free",
    ]),
    securityGuardThreshold: parseUnitInterval(
      input.SHIRE_SECURITY_GUARD_THRESHOLD,
      0.85,
    ),
    outputMaxCharacters: parsePositiveInteger(
      input.SHIRE_OUTPUT_MAX_CHARACTERS,
      12_000,
    ),
    embeddingBaseUrl: normalizeBaseUrl(
      input.SHIRE_EMBEDDING_BASE_URL?.trim() ||
        "https://openrouter.ai/api/v1",
    ),
    agentMemoryUrl:
      input.SHIRE_AGENT_MEMORY_URL?.trim() || "file:./.data/shire-agent-memory.db",
    agentKnowledgeUrl:
      input.SHIRE_AGENT_KNOWLEDGE_URL?.trim() ||
      "file:./.data/shire-agent-knowledge.db",
    agentKnowledgeIndex:
      input.SHIRE_AGENT_KNOWLEDGE_INDEX?.trim() || "shire_context",
    ragTopK: parsePositiveInteger(input.SHIRE_RAG_TOP_K, 5),
    ragMaxCharacters: parsePositiveInteger(
      input.SHIRE_RAG_MAX_CHARACTERS,
      8_000,
    ),
  } as const;
}

export const env = createEnv();
