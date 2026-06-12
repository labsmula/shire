import { ModelRouterEmbeddingModel } from "@mastra/core/llm";
import { embed, embedMany } from "ai";

import { env } from "../env";

(globalThis as { AI_SDK_LOG_WARNINGS?: boolean }).AI_SDK_LOG_WARNINGS = false;

export interface EmbeddingModelConfig {
  modelId?: string;
  baseUrl?: string;
  apiKey?: string;
}

export function createEmbeddingModel(
  config: EmbeddingModelConfig = {},
) {
  return new ModelRouterEmbeddingModel({
    providerId: "openrouter",
    modelId: config.modelId ?? env.embeddingModel,
    url: config.baseUrl ?? env.embeddingBaseUrl,
    apiKey: config.apiKey ?? process.env.OPENROUTER_API_KEY,
  });
}

export async function embedText(value: string) {
  return embed({
    model: createEmbeddingModel(),
    value,
  });
}

export async function embedTexts(values: string[]) {
  return embedMany({
    model: createEmbeddingModel(),
    values,
  });
}
