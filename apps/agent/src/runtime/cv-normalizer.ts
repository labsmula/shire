import { randomUUID } from "node:crypto";

import {
  CandidateProfileDraftSchema,
  buildCandidateEmbeddingText,
} from "./candidate-profile";
import type { CandidateProfileStore } from "./data/candidate-profile-store";
import { normalizeModelUsage } from "./usage";

export type CvNormalizationTier = "cheap" | "balanced";

export type CvGenerationResult = {
  profile: unknown;
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};

export async function normalizeCvWithFallback(input: {
  rawCv: string;
  generate: (request: {
    rawCv: string;
    tier: CvNormalizationTier;
  }) => Promise<CvGenerationResult>;
}) {
  const attempts: Array<{ tier: CvNormalizationTier; error?: string }> = [];

  for (const tier of ["cheap", "cheap", "balanced"] as const) {
    try {
      const result = await input.generate({ rawCv: input.rawCv, tier });
      const profile = CandidateProfileDraftSchema.parse(result.profile);
      return { profile, result, attempts };
    } catch (error) {
      attempts.push({
        tier,
        error:
          error instanceof Error
            ? error.message
            : "Unknown CV normalization error",
      });
    }
  }

  throw new Error(`CV normalization exhausted ${attempts.length} attempts`);
}

export function sanitizeCvText(rawCv: string) {
  return rawCv
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function processCandidateCv(input: {
  candidateId: string;
  rawCv: string;
  store: CandidateProfileStore;
  generate: (request: {
    rawCv: string;
    tier: CvNormalizationTier;
  }) => Promise<CvGenerationResult>;
  embed: (value: string) => Promise<{ embedding: number[] }>;
}) {
  const sanitizedCv = sanitizeCvText(input.rawCv);
  const startedAt = performance.now();
  const normalized = await normalizeCvWithFallback({
    rawCv: sanitizedCv,
    generate: input.generate,
  });
  const embeddingText = buildCandidateEmbeddingText(normalized.profile);
  const { embedding } = await input.embed(embeddingText);
  const tier =
    normalized.attempts.length >= 2
      ? ("balanced" as const)
      : ("cheap" as const);
  const usage = normalizeModelUsage({
    runId: randomUUID(),
    workload: "cv-normalization",
    tier,
    model: normalized.result.model,
    usage: normalized.result.usage,
    latencyMs: Math.round(performance.now() - startedAt),
    retryCount: normalized.attempts.length,
    escalationReason:
      tier === "balanced" ? "schema-validation-failure" : undefined,
  });
  const record = {
    id: input.candidateId,
    status: "PENDING_REVIEW" as const,
    profile: normalized.profile,
    embeddingText,
    embedding,
    usage: [usage],
  };

  await input.store.saveDraft(record);

  return record;
}
