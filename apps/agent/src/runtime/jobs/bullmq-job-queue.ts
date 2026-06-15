import {
  Queue,
  UnrecoverableError,
  Worker,
  type ConnectionOptions,
  type JobsOptions,
} from "bullmq";

import type {
  JobEnvelope,
  JobRequest,
  JobResult,
  ProcessableJob,
} from "./job-contracts";
import { isRetryableJobError } from "./job-errors";

type BullJobLike = {
  id?: string;
  name: string;
  data: JobRequest;
  attemptsMade: number;
  opts: { attempts?: number; delay?: number };
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  returnvalue: JobResult | null;
  failedReason?: string;
  getState: () => Promise<string>;
};

export function createBullJobOptions(input: {
  attempts: number;
  backoffMs: number;
}): JobsOptions {
  return {
    attempts: input.attempts,
    backoff: { type: "exponential", delay: input.backoffMs },
    removeOnComplete: false,
    removeOnFail: false,
  };
}

function mapStatus(state: string): JobEnvelope["status"] {
  if (state === "active") return "active";
  if (state === "completed") return "completed";
  if (state === "failed") return "failed";
  if (state === "delayed") return "delayed";
  return "queued";
}

export async function mapBullJobEnvelope(
  job: BullJobLike,
  candidateId?: string,
): Promise<JobEnvelope | undefined> {
  if (
    candidateId &&
    job.data.name === "cv-parse" &&
    job.data.payload.candidateId !== candidateId
  ) {
    return undefined;
  }

  const state = await job.getState();
  const status = mapStatus(state);
  const nextRetryAt =
    status === "delayed" && job.opts.delay
      ? new Date(job.timestamp + job.opts.delay).toISOString()
      : undefined;

  return {
    id: job.id ?? "",
    name: job.data.name,
    payload: job.data.payload,
    status,
    attempts: job.attemptsMade,
    maxAttempts: job.opts.attempts,
    nextRetryAt,
    createdAt: new Date(job.timestamp).toISOString(),
    startedAt: job.processedOn
      ? new Date(job.processedOn).toISOString()
      : undefined,
    completedAt: job.finishedOn
      ? new Date(job.finishedOn).toISOString()
      : undefined,
    result: job.returnvalue ?? undefined,
    error:
      status === "failed"
        ? {
            code: "JOB_FAILED",
            message: job.failedReason ?? "Job failed",
          }
        : undefined,
  } as JobEnvelope;
}

export type DurableJobRuntime = {
  enqueue(request: JobRequest): Promise<JobEnvelope>;
  get(jobId: string, candidateId?: string): Promise<JobEnvelope | undefined>;
  start(): Promise<void>;
  close(): Promise<void>;
};

export function parseRedisConnection(redisUrl: string): ConnectionOptions {
  const parsed = new URL(redisUrl);
  const database = parsed.pathname.slice(1);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username
      ? decodeURIComponent(parsed.username)
      : undefined,
    password: parsed.password
      ? decodeURIComponent(parsed.password)
      : undefined,
    db: database ? Number(database) : undefined,
    tls: parsed.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

export function createBullMqJobRuntime(input: {
  redisUrl: string;
  queueName: string;
  attempts: number;
  backoffMs: number;
  process: (
    job: ProcessableJob,
    context: { attempt: number; signal: AbortSignal },
  ) => Promise<JobResult>;
}): DurableJobRuntime {
  const connection = parseRedisConnection(input.redisUrl);
  const queue = new Queue<JobRequest, JobResult, string>(input.queueName, {
    connection,
  });
  const abortController = new AbortController();
  const worker = new Worker<JobRequest, JobResult>(
    input.queueName,
    async (job) => {
      try {
        return await input.process(
          {
            id: job.id ?? "",
            name: job.data.name,
            payload: job.data.payload,
          } as ProcessableJob,
          {
            attempt: job.attemptsMade + 1,
            signal: abortController.signal,
          },
        );
      } catch (error) {
        if (!isRetryableJobError(error)) {
          throw new UnrecoverableError(
            error instanceof Error ? error.message : "Permanent job failure",
          );
        }
        throw error;
      }
    },
    {
      connection,
      autorun: false,
    },
  );

  return {
    async enqueue(request) {
      const job = await queue.add(
        request.name,
        request,
        createBullJobOptions(input),
      );
      return (await mapBullJobEnvelope(job as unknown as BullJobLike))!;
    },
    async get(jobId, candidateId) {
      const job = await queue.getJob(jobId);
      return job
        ? mapBullJobEnvelope(job as unknown as BullJobLike, candidateId)
        : undefined;
    },
    async start() {
      worker.run().catch(() => undefined);
      await worker.waitUntilReady();
    },
    async close() {
      abortController.abort();
      await worker.close();
      await queue.close();
    },
  };
}
