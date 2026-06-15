import type {
  JobEnvelope,
  JobRequest,
  JobResult,
} from "./job-contracts";

export interface JobQueue {
  enqueue(request: JobRequest): Promise<JobEnvelope>;
  reserve(): Promise<JobEnvelope | undefined>;
  get(jobId: string): Promise<JobEnvelope | undefined>;
  markActive(jobId: string): Promise<void>;
  markCompleted(jobId: string, result: JobResult): Promise<void>;
  markFailed(
    jobId: string,
    error: { code: string; message: string },
  ): Promise<void>;
  waitForJob(signal: AbortSignal): Promise<void>;
}
