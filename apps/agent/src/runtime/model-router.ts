import { env } from "../env";
import type { AgentWorkload, ModelTier } from "./model-policy";
import { getWorkloadPolicy } from "./model-policy";

export type ModelRequestContext = {
  workload?: AgentWorkload;
  tierOverride?: ModelTier;
};

export function createModelFallbackChain(models: readonly string[]) {
  return models.map((model) => ({ model, maxRetries: 1 }));
}

const defaultChatModel = "openrouter/openai/gpt-oss-20b:free";

export function resolveModelChain(input: ModelRequestContext) {
  if (!input.workload) {
    throw new Error("A workload is required to resolve the model chain.");
  }

  const tier =
    input.tierOverride ?? getWorkloadPolicy(input.workload).tier;
  return createModelFallbackChain(env.modelChains[tier]);
}

export function resolveRuntimeAgentModelId(input: ModelRequestContext = {}) {
  if (!input.workload) {
    return defaultChatModel;
  }

  const tier =
    input.tierOverride ?? getWorkloadPolicy(input.workload).tier;
  return env.modelChains[tier][0] ?? defaultChatModel;
}

export const dynamicAgentModel = ({
  requestContext,
}: {
  requestContext: { get: (key: string) => unknown };
}) => {
  const workload = requestContext.get("workload") as AgentWorkload | undefined;
  const tierOverride = requestContext.get("tier-override") as
    | ModelTier
    | undefined;

  if (!workload) {
    return createModelFallbackChain(env.modelChains.cheap);
  }

  return resolveModelChain({ workload, tierOverride });
};
