import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { MastraModelGateway } from "@mastra/core/llm";

import { env } from "../../env";
import { logger } from "../../runtime/logger";

const gatewayLogger = logger.child({ component: "zai-gateway" });

export class ZaiGateway extends MastraModelGateway {
  readonly id = "zai";
  readonly name = "Z.ai";

  async fetchProviders() {
    return {
      zai: {
        name: "Z.ai",
        models: ["glm-4.5-air", "glm-4.5"],
        apiKeyEnvVar: "ZAI_API_KEY",
        gateway: this.id,
        url: env.zaiBaseUrl,
      },
    };
  }

  buildUrl() {
    return env.zaiBaseUrl;
  }

  async getApiKey() {
    if (!env.zaiApiKey) {
      throw new Error("Missing ZAI_API_KEY environment variable");
    }

    return env.zaiApiKey;
  }

  async resolveLanguageModel({
    modelId,
    providerId,
    apiKey,
  }: {
    modelId: string;
    providerId: string;
    apiKey: string;
  }): Promise<any> {
    const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await globalThis.fetch(input, init);

      if (!response.ok) {
        const errorBody = await response.clone().text();
        gatewayLogger.error(
          {
            modelId,
            providerId,
            url: String(input),
            status: response.status,
            body: errorBody,
          },
          "z.ai upstream request failed",
        );
      }

      return response;
    };

    return createOpenAICompatible({
      name: providerId,
      apiKey,
      baseURL: env.zaiBaseUrl,
      fetch,
    }).chatModel(modelId);
  }
}

export const zaiGateway = new ZaiGateway();
