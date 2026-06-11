import type { AgentWorkload, ModelTier } from "./model-policy";

export type ModelUsageRecord = {
  runId: string;
  workload: AgentWorkload;
  tier: ModelTier;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs: number;
  retryCount: number;
  escalationReason?: string;
};

export function normalizeModelUsage(input: {
  runId: string;
  workload: AgentWorkload;
  tier: ModelTier;
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  latencyMs: number;
  retryCount: number;
  escalationReason?: string;
}): ModelUsageRecord {
  const record: ModelUsageRecord = {
    runId: input.runId,
    workload: input.workload,
    tier: input.tier,
    provider: input.model.split("/", 1)[0],
    model: input.model,
    inputTokens: input.usage?.inputTokens,
    outputTokens: input.usage?.outputTokens,
    totalTokens: input.usage?.totalTokens,
    latencyMs: input.latencyMs,
    retryCount: input.retryCount,
  };

  if (input.escalationReason !== undefined) {
    record.escalationReason = input.escalationReason;
  }

  return record;
}
