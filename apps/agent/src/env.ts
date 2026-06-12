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
        "openrouter/meta-llama/llama-3.3-70b-instruct:free",
        "zai/zai/glm-4.5-air",
        "openai/gpt-4.1-mini",
      ]),
      balanced: parseModelChain(input.SHIRE_MODEL_BALANCED, [
        "zai/zai/glm-4.5-air",
        "openrouter/qwen/qwen3-32b",
        "openai/gpt-4.1-mini",
      ]),
      heavy: parseModelChain(input.SHIRE_MODEL_HEAVY, [
        "openai/gpt-5",
        "zai/zai/glm-4.5",
      ]),
    },
    embeddingModel: input.SHIRE_EMBEDDING_MODEL?.trim() || "text-embedding-3-small",
    agentMemoryUrl:
      input.SHIRE_AGENT_MEMORY_URL?.trim() || "file:./.data/shire-agent-memory.db",
    agentKnowledgeUrl:
      input.SHIRE_AGENT_KNOWLEDGE_URL?.trim() ||
      "file:./.data/shire-agent-knowledge.db",
    agentKnowledgeIndex:
      input.SHIRE_AGENT_KNOWLEDGE_INDEX?.trim() || "shire-context",
    ragTopK: parsePositiveInteger(input.SHIRE_RAG_TOP_K, 5),
    ragMaxCharacters: parsePositiveInteger(
      input.SHIRE_RAG_MAX_CHARACTERS,
      8_000,
    ),
    openAiApiKey: input.OPENAI_API_KEY?.trim() || undefined,
    openRouterApiKey: input.OPENROUTER_API_KEY?.trim() || undefined,
    zaiApiKey: input.ZAI_API_KEY?.trim() || undefined,
    zaiBaseUrl:
      input.ZAI_BASE_URL?.trim() || "https://api.z.ai/api/coding/paas/v4",
  } as const;
}

export const env = createEnv();
