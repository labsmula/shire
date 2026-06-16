import { z } from "zod";

import type { CandidateProfileDraft } from "../candidate-profile";
import type { ModelUsageRecord } from "../usage";

const cvParseRequestSchema = z.object({
  name: z.literal("cv-parse"),
  payload: z.object({
    candidateId: z.string().trim().min(1),
    rawCv: z.string().trim().min(1).max(100_000),
  }),
});

const onchainSyncRequestSchema = z.object({
  name: z.literal("onchain-sync"),
  payload: z.object({
    chain: z.literal("Celo"),
  }),
});

export const jobRequestSchema = z.discriminatedUnion("name", [
  cvParseRequestSchema,
  onchainSyncRequestSchema,
]);

export type JobRequest = z.infer<typeof jobRequestSchema>;
export type JobName = JobRequest["name"];
export type JobStatus =
  | "queued"
  | "delayed"
  | "active"
  | "completed"
  | "failed";

export type JobPayloadMap = {
  "cv-parse": Extract<JobRequest, { name: "cv-parse" }>["payload"];
  "onchain-sync": Extract<JobRequest, { name: "onchain-sync" }>["payload"];
};

export type JobResultMap = {
  "cv-parse": {
    candidateId: string;
    status: "PENDING_REVIEW";
    profile: CandidateProfileDraft;
    embeddingDimensions: number;
    usage: ModelUsageRecord[];
    llmInvoked: true;
  };
  "onchain-sync": {
    status: "ready";
    chain: "Celo";
    llmInvoked: false;
  };
};

export type JobResult = JobResultMap[JobName];

export type JobEnvelope = {
  id: string;
  name: JobName;
  payload: JobPayloadMap[JobName];
  status: JobStatus;
  attempts: number;
  maxAttempts?: number;
  nextRetryAt?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: JobResult;
  error?: {
    code: string;
    message: string;
  };
};

export type ProcessableJob = Pick<JobEnvelope, "id" | "name" | "payload">;

export function parseJobRequest(input: unknown): JobRequest {
  return jobRequestSchema.parse(input);
}
