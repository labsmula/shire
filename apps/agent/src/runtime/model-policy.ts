export type ModelTier = "cheap" | "balanced" | "heavy";

export type AgentWorkload =
  | "cv-normalization"
  | "knowledge-synthesis"
  | "job-rerank"
  | "talent-rerank"
  | "recommendation-explanation"
  | "workflow-summary"
  | "dispute-summary";

export type WorkloadPolicy = {
  tier: ModelTier;
  maxOutputTokens: number;
  confidenceThreshold?: number;
};

const policies: Record<AgentWorkload, WorkloadPolicy> = {
  "cv-normalization": {
    tier: "cheap",
    maxOutputTokens: 1_500,
    confidenceThreshold: 0.7,
  },
  "knowledge-synthesis": { tier: "cheap", maxOutputTokens: 700 },
  "job-rerank": { tier: "cheap", maxOutputTokens: 700 },
  "talent-rerank": { tier: "cheap", maxOutputTokens: 700 },
  "recommendation-explanation": { tier: "cheap", maxOutputTokens: 500 },
  "workflow-summary": { tier: "cheap", maxOutputTokens: 500 },
  "dispute-summary": { tier: "heavy", maxOutputTokens: 2_000 },
};

export function getWorkloadPolicy(workload: AgentWorkload) {
  return policies[workload];
}

export function shouldEscalate(input: {
  workload: AgentWorkload;
  schemaFailureCount: number;
  confidence?: number;
}) {
  const policy = getWorkloadPolicy(input.workload);

  return (
    input.schemaFailureCount >= 2 ||
    (input.schemaFailureCount === 0 &&
      policy.confidenceThreshold !== undefined &&
      input.confidence !== undefined &&
      input.confidence < policy.confidenceThreshold)
  );
}
