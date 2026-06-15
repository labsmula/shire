import { logger } from "../logger";
import type {
  JobResult,
  ProcessableJob,
} from "./job-contracts";
import type { JobQueue } from "./job-queue";

type ProcessJob = (
  job: ProcessableJob,
  context: { attempt: number; signal: AbortSignal },
) => Promise<JobResult>;

const workerLogger = logger.child({ component: "agent-worker" });

export class AgentWorker {
  private readonly abortController = new AbortController();
  private loopPromise?: Promise<void>;

  constructor(
    private readonly dependencies: {
      queue: JobQueue;
      process: ProcessJob;
    },
  ) {}

  start() {
    if (this.loopPromise) {
      return;
    }

    workerLogger.info("worker started");
    this.loopPromise = this.runLoop();
  }

  async close() {
    this.abortController.abort();
    await this.loopPromise;
    workerLogger.info("worker stopped");
  }

  private async runLoop() {
    const signal = this.abortController.signal;

    while (!signal.aborted) {
      const job = await this.dependencies.queue.reserve();
      if (!job) {
        await this.dependencies.queue.waitForJob(signal);
        continue;
      }

      const startedAt = performance.now();
      await this.dependencies.queue.markActive(job.id);
      workerLogger.info(
        { jobId: job.id, jobName: job.name, attempt: job.attempts + 1 },
        "job started",
      );

      try {
        const result = await this.dependencies.process(
          {
            id: job.id,
            name: job.name,
            payload: job.payload,
          },
          {
            attempt: job.attempts + 1,
            signal,
          },
        );
        await this.dependencies.queue.markCompleted(job.id, result);
        workerLogger.info(
          {
            jobId: job.id,
            jobName: job.name,
            durationMs: Math.round(performance.now() - startedAt),
          },
          "job completed",
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown worker error";
        await this.dependencies.queue.markFailed(job.id, {
          code: "WORKER_EXECUTION_FAILED",
          message,
        });
        workerLogger.error(
          {
            jobId: job.id,
            jobName: job.name,
            durationMs: Math.round(performance.now() - startedAt),
            err: error,
          },
          "job failed",
        );
      }
    }
  }
}
