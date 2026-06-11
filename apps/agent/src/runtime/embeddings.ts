import { createOpenAI } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";

import { env } from "../env";

function getEmbeddingModel() {
  const openai = createOpenAI({ apiKey: env.openAiApiKey });
  return openai.embedding(env.embeddingModel);
}

export async function embedText(value: string) {
  return embed({
    model: getEmbeddingModel(),
    value,
  });
}

export async function embedTexts(values: string[]) {
  return embedMany({
    model: getEmbeddingModel(),
    values,
  });
}
