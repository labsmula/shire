import type { AgentWorkload } from "./model-policy";
import { getWorkloadPolicy } from "./model-policy";
import { resolveModelChain } from "./model-router";

export const jobWorkloads = {
  "cv-parse": "cv-normalization",
  "job-matching": "job-rerank",
  "talent-matching": "talent-rerank",
  "dispute-summary": "dispute-summary",
} as const satisfies Record<string, AgentWorkload>;

export type RoutedJobName = keyof typeof jobWorkloads;

export function createJobRouting(
  job: RoutedJobName,
  escalationReason?: string,
) {
  const workload = jobWorkloads[job];
  const tier = getWorkloadPolicy(workload).tier;
  const routing = {
    workload,
    tier,
    attemptedModels: resolveModelChain({ workload }).map(
      (entry) => entry.model,
    ),
    ...(escalationReason ? { escalationReason } : {}),
  };

  return routing;
}
