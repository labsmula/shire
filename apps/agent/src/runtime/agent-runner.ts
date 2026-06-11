import { randomUUID } from "node:crypto";

import { RequestContext } from "@mastra/core/request-context";

import type { KnowledgeResult } from "./knowledge";
import {
  buildKnowledgeSystemMessage,
  searchKnowledge,
} from "./knowledge";
import type { AgentWorkload, ModelTier } from "./model-policy";
import { getWorkloadPolicy } from "./model-policy";
import { resolveModelChain } from "./model-router";
import { normalizeModelUsage } from "./usage";

type AgentMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type AgentResponse = {
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  response?: {
    modelId?: string;
  };
  [key: string]: unknown;
};

export async function runAgentWithContext(input: {
  agent: {
    generate: (
      messages: unknown,
      options?: unknown,
    ) => Promise<AgentResponse>;
  };
  workload: AgentWorkload;
  threadId: string;
  resourceId: string;
  query?: string;
  tierOverride?: ModelTier;
  messages: AgentMessage[];
  search?: (query: string) => Promise<KnowledgeResult[]>;
}) {
  const requestContext = new RequestContext();
  requestContext.set("workload", input.workload);
  if (input.tierOverride) {
    requestContext.set("tier-override", input.tierOverride);
  }

  const search = input.search ?? searchKnowledge;
  const knowledge = input.query?.trim()
    ? await search(input.query.trim())
    : [];
  const messages = knowledge.length
    ? [
        {
          role: "system" as const,
          content: buildKnowledgeSystemMessage(knowledge),
        },
        ...input.messages,
      ]
    : input.messages;

  const startedAt = performance.now();
  const response = await input.agent.generate(messages, {
    requestContext,
    memory: {
      thread: input.threadId,
      resource: input.resourceId,
    },
    maxOutputTokens: getWorkloadPolicy(input.workload).maxOutputTokens,
  });
  const tier =
    input.tierOverride ?? getWorkloadPolicy(input.workload).tier;
  const configuredModel = resolveModelChain({
    workload: input.workload,
    tierOverride: input.tierOverride,
  })[0].model;

  return {
    response,
    usage: normalizeModelUsage({
      runId: randomUUID(),
      workload: input.workload,
      tier,
      model: response.response?.modelId ?? configuredModel,
      usage: response.usage,
      latencyMs: Math.round(performance.now() - startedAt),
      retryCount: 0,
    }),
  };
}
