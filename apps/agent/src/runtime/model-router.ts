import { env } from "../env";
import type { AgentWorkload, ModelTier } from "./model-policy";
import { getWorkloadPolicy } from "./model-policy";

export type ModelRequestContext = {
  workload: AgentWorkload;
  tierOverride?: ModelTier;
};

export function createModelFallbackChain(models: readonly string[]) {
  return models.map((model) => ({ model, maxRetries: 1 }));
}

export function resolveModelChain(input: ModelRequestContext) {
  const tier = input.tierOverride ?? getWorkloadPolicy(input.workload).tier;
  return createModelFallbackChain(env.modelChains[tier]);
}

export const dynamicAgentModel = ({
  requestContext,
}: {
  requestContext: { get: (key: string) => unknown };
}) => {
  const workload = requestContext.get("workload") as AgentWorkload;
  const tierOverride = requestContext.get("tier-override") as
    | ModelTier
    | undefined;

  return resolveModelChain({ workload, tierOverride });
};
